/**
 * Canvas Setup für jsdom-Tests
 * Stellt sicher, dass Canvas-Operationen in Tests funktionieren
 */

// Erstelle einen einfachen Mock für Canvas getContext
if (typeof HTMLCanvasElement !== 'undefined') {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  
  HTMLCanvasElement.prototype.getContext = function(
    contextType: string,
    ...args: any[]
  ) {
    if (contextType === '2d') {
      const canvas = this;
      
      // Erstelle einen Mock-Context mit den wichtigsten Methoden
      const mockContext = {
        canvas,
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        font: '10px sans-serif',
        textAlign: 'start' as CanvasTextAlign,
        textBaseline: 'alphabetic' as CanvasTextBaseline,
        
        // Einfache Mock-Methoden
        measureText: function(this: any, text: string) {
          // Parse font size from font property (e.g., "16px Arial" -> 16)
          // Use 'this' to access the mockContext's font property
          const currentFont = this.font || '10px sans-serif';
          const fontMatch = currentFont.match(/(\d+)px/);
          const fontSize = fontMatch ? parseInt(fontMatch[1], 10) : 10;
          // Estimate width based on font size: roughly 0.6 * fontSize per character
          const width = text.length * (fontSize * 0.6);
          return {
            width,
            actualBoundingBoxLeft: 0,
            actualBoundingBoxRight: width,
            actualBoundingBoxAscent: fontSize * 0.7,
            actualBoundingBoxDescent: fontSize * 0.2,
            fontBoundingBoxAscent: fontSize * 0.7,
            fontBoundingBoxDescent: fontSize * 0.2,
            emHeightAscent: fontSize * 0.7,
            emHeightDescent: fontSize * 0.2,
            hangingBaseline: fontSize * 0.6,
            alphabeticBaseline: 0,
            ideographicBaseline: -fontSize * 0.1,
          } as TextMetrics;
        },
        
        getImageData: function(sx: number, sy: number, sw: number, sh: number) {
          return {
            data: new Uint8ClampedArray(sw * sh * 4),
            width: sw,
            height: sh,
          };
        },
        
        createImageData: function(width: number, height: number) {
          return {
            data: new Uint8ClampedArray(width * height * 4),
            width,
            height,
          };
        },
        
        // Stub-Methoden (tun nichts, aber existieren)
        save: function() {},
        restore: function() {},
        fillRect: function() {},
        strokeRect: function() {},
        clearRect: function() {},
        fillText: function() {},
        strokeText: function() {},
        beginPath: function() {},
        closePath: function() {},
        moveTo: function() {},
        lineTo: function() {},
        rect: function() {},
        fill: function() {},
        stroke: function() {},
        putImageData: function() {},
      };
      
      return mockContext as any;
    }
    
    // Fallback zur originalen Implementierung
    if (originalGetContext) {
      return originalGetContext.call(this, contextType, ...args);
    }
    
    return null;
  };
}

