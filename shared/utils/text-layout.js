/**
 * Plattformunabhängige Text-Layout-Funktionen (JavaScript-Version für Server)
 * Exakte Kopie der TypeScript-Implementierung für gemeinsame Nutzung
 */

const LINE_HEIGHT = {
  small: 1,
  medium: 1.2,
  large: 1.5
};

/**
 * Build font string from style
 */
function buildFont(style) {
  const weight = style.fontBold ? 'bold ' : '';
  const italic = style.fontItalic ? 'italic ' : '';
  return `${weight}${italic}${style.fontSize}px ${style.fontFamily}`;
}

/**
 * Get line height based on paragraph spacing
 */
function getLineHeight(style) {
  const spacing = style.paragraphSpacing || 'medium';
  return style.fontSize * (LINE_HEIGHT[spacing] ?? 1.2);
}

/**
 * Measure text width
 */
function measureText(text, style, ctx) {
  if (!ctx) {
    return text.length * (style.fontSize * 0.6);
  }
  ctx.save();
  ctx.font = buildFont(style);
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
}

/**
 * Calculate text X position based on alignment
 */
function calculateTextX(text, style, startX, availableWidth, ctx) {
  const align = style.align || 'left';
  const textWidth = measureText(text, style, ctx);
  
  switch (align) {
    case 'center':
      return startX + (availableWidth - textWidth) / 2;
    case 'right':
      return startX + availableWidth - textWidth;
    case 'justify':
      // For justify, we'll use left alignment for now
      // Full justify implementation would require word spacing adjustment
      return startX;
    case 'left':
    default:
      return startX;
  }
}

/**
 * Wrap text into lines
 */
function wrapText(text, style, maxWidth, ctx) {
  const lines = [];
  if (!text) return lines;
  const paragraphs = text.split('\n');
  paragraphs.forEach((paragraph, paragraphIdx) => {
    const words = paragraph.split(' ').filter(Boolean);
    if (words.length === 0) {
      lines.push({ text: '', width: 0 });
    } else {
      let currentLine = words[0];
      for (let i = 1; i < words.length; i += 1) {
        const word = words[i];
        const testLine = `${currentLine} ${word}`;
        const testWidth = measureText(testLine, style, ctx);
        if (testWidth > maxWidth && currentLine) {
          lines.push({ text: currentLine, width: measureText(currentLine, style, ctx) });
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      lines.push({ text: currentLine, width: measureText(currentLine, style, ctx) });
    }
  });
  return lines;
}

module.exports = {
  buildFont,
  getLineHeight,
  measureText,
  calculateTextX,
  wrapText
};

