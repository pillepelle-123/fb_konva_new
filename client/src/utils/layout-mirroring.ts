import type { PageTemplate } from '../types/template-types';

const DEFAULT_PAGE_WIDTH = 2480;

export function getMirroredTemplateId(templateId: string) {
  return `${templateId}__mirrored`;
}

export function mirrorTemplate(template: PageTemplate): PageTemplate {
  const pageWidth = template.baseSize?.width ?? DEFAULT_PAGE_WIDTH;

  // Spiegele X-Position basierend auf dem Mittelpunkt des Elements
  const mirrorX = (x: number, width: number) => {
    const centerX = x + width / 2;
    const mirroredCenterX = pageWidth - centerX;
    return mirroredCenterX - width / 2;
  };

  // Berechne Position und Korrektur für Rotation um den Mittelpunkt
  // Konva rotiert standardmäßig um den oberen linken Punkt, aber wir wollen um den Mittelpunkt rotieren
  // Beim Spiegeln müssen wir X und Y anpassen, um die visuelle Position zu korrigieren
  const calculateMirroredPosition = (
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number
  ): { x: number; y: number } => {
    if (!rotation || rotation === 0) {
      // Keine Rotation: nur X spiegeln
      return {
        x: mirrorX(x, width),
        y: y
      };
    }

    const rotationRad = (rotation * Math.PI) / 180;
    
    // Mittelpunkt des Original-Elements
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    // Gespiegelter Mittelpunkt (X gespiegelt, Y bleibt gleich)
    // Berechne die Position des oberen linken Punkts bei gespiegelter Rotation (-r) um den gespiegelten Mittelpunkt
    // Relativer Vektor vom Mittelpunkt zum oberen linken Punkt: (-width/2, -height/2)
    // Nach Rotation -r:
    // x' = -width/2 * cos(-r) + height/2 * sin(-r)
    // y' = -width/2 * sin(-r) - height/2 * cos(-r)
    const mirroredCenterX = pageWidth - centerX;
    const mirroredCenterY = centerY;
    
    // Berechne die Position des oberen linken Punkts bei gespiegelter Rotation (-r) um den gespiegelten Mittelpunkt
    const mirroredRotationRad = -rotationRad;
    const mirroredTopLeftX = mirroredCenterX - (width / 2) * Math.cos(mirroredRotationRad) + (height / 2) * Math.sin(mirroredRotationRad);
    const mirroredTopLeftY = mirroredCenterY - (width / 2) * Math.sin(mirroredRotationRad) - (height / 2) * Math.cos(mirroredRotationRad);
    
    // Zusätzliche X- und Y-Korrekturen: Konva rotiert um den oberen linken Punkt, nicht um den Mittelpunkt
    // Wir müssen die Differenz zwischen Rotation um Mittelpunkt und Rotation um oberen linken Punkt ausgleichen
    
    // Berechne die Position des oberen linken Punkts bei Original-Rotation um den Original-Mittelpunkt
    const originalTopLeftX = centerX - (width / 2) * Math.cos(rotationRad) + (height / 2) * Math.sin(rotationRad);
    const originalTopLeftY = centerY - (width / 2) * Math.sin(rotationRad) - (height / 2) * Math.cos(rotationRad);
    
    // Die Differenz zwischen der tatsächlichen Position (x, y) und der berechneten Position bei Rotation um Mittelpunkt
    // gibt uns die Korrektur, die wir für die gespiegelte Position benötigen
    const xOffsetFromCenter = x - originalTopLeftX;
    const yOffsetFromCenter = y - originalTopLeftY;
    
    // Für die gespiegelte Position müssen wir diese Korrektur anwenden
    // Aber da wir spiegeln, müssen wir das Vorzeichen der X-Korrektur umkehren
    const xCorrection = -xOffsetFromCenter;
    const yCorrection = yOffsetFromCenter;
    
    // Die gespiegelte Position ist die Position des oberen linken Punkts bei gespiegelter Rotation + Korrektur
    return {
      x: mirroredTopLeftX + xCorrection,
      y: mirroredTopLeftY + yCorrection
    };
  };

  return {
    ...template,
    id: getMirroredTemplateId(template.id),
    name: `${template.name} (Mirrored)`,
    textboxes: template.textboxes.map((textbox) => {
      const rotation = (textbox as { rotation?: number }).rotation ?? 0;
      const width = textbox.size.width ?? 0;
      const height = textbox.size.height ?? 0;
      const mirroredPos = calculateMirroredPosition(
        textbox.position.x,
        textbox.position.y,
        width,
        height,
        rotation
      );
      
      return {
        ...textbox,
        position: {
          ...textbox.position,
          x: mirroredPos.x,
          y: mirroredPos.y
        },
        // Negiere Rotation beim Spiegeln: rotation 5 wird zu -5
        ...(rotation !== undefined && rotation !== null && rotation !== 0 ? { rotation: -rotation } : {})
      };
    }),
    elements: template.elements.map((element) => {
      const rotation = (element as { rotation?: number }).rotation ?? 0;
      const width = element.size.width ?? 0;
      const height = element.size.height ?? 0;
      const mirroredPos = calculateMirroredPosition(
        element.position.x,
        element.position.y,
        width,
        height,
        rotation
      );
      
      return {
        ...element,
        position: {
          ...element.position,
          x: mirroredPos.x,
          y: mirroredPos.y
        },
        // Negiere Rotation beim Spiegeln: rotation 5 wird zu -5
        ...(rotation !== undefined && rotation !== null && rotation !== 0 ? { rotation: -rotation } : {})
      };
    })
  };
}

