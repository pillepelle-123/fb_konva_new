import Konva from 'konva';

/**
 * Konvertiert alle Bilder in einem Konva Node (Layer oder Stage) zu Base64,
 * um CORS-Probleme (Tainted Canvas) beim Export zu vermeiden
 * @param node - Der Konva Node (Stage oder Layer), dessen Bilder konvertiert werden sollen
 */
async function convertImagesToBase64(node: Konva.Node): Promise<void> {
  // Finde alle Image-Nodes in allen Layern
  const layers = node instanceof Konva.Stage ? node.getLayers() : [node as Konva.Layer];
  
  const conversionPromises: Promise<void>[] = [];
  
  for (const layer of layers) {
    // Finde alle Image-Nodes
    const imageNodes = layer.find<Konva.Image>('Image');
    
    for (const imageNode of imageNodes) {
      const imageElement = imageNode.image();
      if (imageElement && imageElement.src && !imageElement.src.startsWith('data:')) {
        conversionPromises.push(
          (async () => {
            try {
              let imageUrl = imageElement.src;

              // Check if this is already a proxy URL, extract the original URL
              let originalUrl = imageUrl;
              if (imageUrl.includes('/images/proxy?url=')) {
                try {
                  const urlObj = new URL(imageUrl);
                  const encodedUrl = urlObj.searchParams.get('url');
                  if (encodedUrl) {
                    originalUrl = decodeURIComponent(encodedUrl);
                  }
                } catch (error) {
                  console.warn('Failed to parse proxy URL:', error);
                }
              }

              // Check if this is an S3 URL that needs proxy
              const isS3Url = originalUrl.includes('s3.amazonaws.com') || originalUrl.includes('s3.us-east-1.amazonaws.com');

              // For S3 URLs, use the proxy endpoint to avoid CORS issues
              if (isS3Url) {
                // Get token from localStorage
                const token = localStorage.getItem('token') || '';
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                imageUrl = `${apiUrl}/images/proxy?url=${encodeURIComponent(originalUrl)}&token=${encodeURIComponent(token)}`;
              }

              // Fetch the image as blob and convert to base64
              const response = await fetch(imageUrl);
              const blob = await response.blob();

              // Convert blob to base64
              const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });

              // Create new image from base64
              const base64Image = new window.Image();
              base64Image.src = base64Data;

              await new Promise<void>((resolve, reject) => {
                base64Image.onload = () => {
                  imageNode.image(base64Image);
                  resolve();
                };
                base64Image.onerror = reject;
              });
            } catch (error) {
              console.warn('Failed to convert image to base64:', error);
              // Continue with original image if conversion fails
            }
          })()
        );
      }
    }
    
    // Auch Pattern-Fills in Rect-Nodes prüfen
    const rectNodes = layer.find<Konva.Rect>('Rect');
    for (const rectNode of rectNodes) {
      // Prüfe auf fillPatternImage (TypeScript-typisiert als any, da es eine interne Konva-Eigenschaft ist)
      const fillPatternImage = (rectNode as any).fillPatternImage?.();
      if (fillPatternImage && fillPatternImage.src && !fillPatternImage.src.startsWith('data:')) {
        conversionPromises.push(
          (async () => {
            try {
              let imageUrl = fillPatternImage.src;

              // Check if this is already a proxy URL, extract the original URL
              let originalUrl = imageUrl;
              if (imageUrl.includes('/images/proxy?url=')) {
                try {
                  const urlObj = new URL(imageUrl);
                  const encodedUrl = urlObj.searchParams.get('url');
                  if (encodedUrl) {
                    originalUrl = decodeURIComponent(encodedUrl);
                  }
                } catch (error) {
                  console.warn('Failed to parse proxy URL:', error);
                }
              }

              // Check if this is an S3 URL that needs proxy
              const isS3Url = originalUrl.includes('s3.amazonaws.com') || originalUrl.includes('s3.us-east-1.amazonaws.com');

              // For S3 URLs, use the proxy endpoint to avoid CORS issues
              if (isS3Url) {
                const token = localStorage.getItem('token') || '';
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                imageUrl = `${apiUrl}/images/proxy?url=${encodeURIComponent(originalUrl)}&token=${encodeURIComponent(token)}`;
              }

              // Fetch the image as blob and convert to base64
              const response = await fetch(imageUrl);
              const blob = await response.blob();

              // Convert blob to base64
              const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });

              // Create new image from base64
              const base64Image = new window.Image();
              base64Image.src = base64Data;

              await new Promise<void>((resolve, reject) => {
                base64Image.onload = () => {
                  (rectNode as any).fillPatternImage(base64Image);
                  resolve();
                };
                base64Image.onerror = reject;
              });
            } catch (error) {
              console.warn('Failed to convert pattern fill image to base64:', error);
              // Continue with original image if conversion fails
            }
          })()
        );
      }
    }
  }

  await Promise.all(conversionPromises);
}

/**
 * Exportiert eine Konva Stage als Bild mit reduzierter Auflösung und Qualität für Preview
 * @param stage - Die Konva Stage Instanz
 * @param resolutionScale - Auflösungs-Skalierung (0.1-1.0), Standard: 0.5 für Preview (50% der Originalauflösung)
 * @param jpegQuality - JPEG-Qualität (0.1-1.0), Standard: 0.75 für gute Balance zwischen Qualität und Dateigröße
 * @returns Promise mit Data URL des exportierten Bildes
 */
export async function exportCanvasAsImage(
  stage: Konva.Stage | null,
  resolutionScale: number = 0.5,
  jpegQuality: number = 0.75
): Promise<string | null> {
  if (!stage) {
    return null;
  }

  try {
    // Konvertiere alle Bilder zu Base64, um CORS-Probleme zu vermeiden
    await convertImagesToBase64(stage);
    
    // Exportiere als Bild mit reduzierter Auflösung (pixelRatio) und JPEG-Komprimierung
    // pixelRatio reduziert die tatsächliche Auflösung (weniger Pixel)
    //   - Bei 0.5: 2480x3508 -> 1240x1754 Pixel (50% weniger Pixel = ~75% kleinere Datei)
    // quality reduziert die JPEG-Komprimierung (kleinere Datei bei ähnlicher Auflösung)
    //   - Bei 0.75: Gute Balance zwischen Qualität und Dateigröße
    const dataURL = stage.toDataURL({
      pixelRatio: resolutionScale, // Reduziert die Auflösung (z.B. 0.5 = 50% der Pixel)
      mimeType: 'image/jpeg', // JPEG ist kleiner als PNG
      quality: jpegQuality // JPEG-Komprimierung (0.75 = gute Balance)
    });

    return dataURL;
  } catch (error) {
    console.error('Error exporting canvas:', error);
    return null;
  }
}

/**
 * Exportiert nur die Seite (ohne UI-Elemente wie Transformer, Selection etc.)
 * @param stage - Die Konva Stage Instanz
 * @param pageLayerId - ID des Layers, der die Seite enthält
 * @param resolutionScale - Auflösungs-Skalierung (0.1-1.0), Standard: 0.5
 * @param jpegQuality - JPEG-Qualität (0.1-1.0), Standard: 0.75
 * @returns Promise mit Data URL des exportierten Bildes
 */
export async function exportPageAsImage(
  stage: Konva.Stage | null,
  pageLayerId: string = 'page-layer',
  resolutionScale: number = 0.5,
  jpegQuality: number = 0.75
): Promise<string | null> {
  if (!stage) {
    return null;
  }

  try {
    // Finde den Page-Layer
    const pageLayer = stage.findOne(`#${pageLayerId}`);
    
    if (!pageLayer) {
      // Fallback: Exportiere die gesamte Stage
      return exportCanvasAsImage(stage, resolutionScale, jpegQuality);
    }

    // Konvertiere alle Bilder im Page-Layer zu Base64, um CORS-Probleme zu vermeiden
    await convertImagesToBase64(pageLayer as Konva.Layer);

    // Exportiere nur den Page-Layer mit reduzierter Auflösung und Qualität
    const dataURL = (pageLayer as Konva.Node).toDataURL({
      pixelRatio: resolutionScale, // Reduziert die Auflösung
      mimeType: 'image/jpeg', // JPEG ist kleiner als PNG
      quality: jpegQuality // JPEG-Komprimierung
    });

    return dataURL;
  } catch (error) {
    console.error('Error exporting page:', error);
    return null;
  }
}

