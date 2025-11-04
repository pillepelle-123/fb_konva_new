import Konva from 'konva';

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

