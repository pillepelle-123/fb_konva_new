/**
 * Shared Style Engine - Pure JavaScript Style-Algorithmen
 * Linien-/Border-Styles: default, rough, glow, candy, zigzag, wobbly, dashed
 *
 * Alle externen Abhängigkeiten (document, roughInstance) werden über Options injiziert
 */

// Stroke width conversion – works in both browser (ESM) and Node (CJS)
let commonToActualStrokeWidth = (width, _style) => width;
if (typeof require !== 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const strokeConverter = require('./stroke-width-converter');
    commonToActualStrokeWidth = strokeConverter.commonToActualStrokeWidth;
  } catch (_error) {
    // Fallback: leave commonToActualStrokeWidth as identity function
  }
}

/**
 * Helper function for complex shapes
 * Generates SVG path strings for triangle, polygon, heart, star, etc.
 */
function generateComplexShapePath(element) {
  const w = element.width || 0;
  const h = element.height || 0;
  
  switch (element.type) {
    case 'triangle':
      return `M ${w/2} 0 L ${w} ${h} L 0 ${h} Z`;
    
    case 'polygon': {
      const sides = element.polygonSides || 5;
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2;
      const points = [];
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
      }
      return `M ${points[0][0]} ${points[0][1]} ` + points.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') + ' Z';
    }
    
    case 'heart':
      return `M ${w/2} ${h*0.8} C ${w/2} ${h*0.8} ${w*0.1} ${h*0.4} ${w*0.1} ${h*0.25} C ${w*0.1} ${h*0.1} ${w*0.25} ${h*0.05} ${w/2} ${h*0.25} C ${w*0.75} ${h*0.05} ${w*0.9} ${h*0.1} ${w*0.9} ${h*0.25} C ${w*0.9} ${h*0.4} ${w/2} ${h*0.8} ${w/2} ${h*0.8} Z`;
    
    case 'star': {
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 * 0.8;
      const points = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5;
        const radius = i % 2 === 0 ? r : r * 0.4;
        points.push([cx + radius * Math.cos(angle - Math.PI/2), cy + radius * Math.sin(angle - Math.PI/2)]);
      }
      return `M ${points[0][0]} ${points[0][1]} ` + points.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') + ' Z';
    }
    
    case 'speech-bubble':
      return `M ${w*0.1} ${h*0.2} Q ${w*0.1} ${h*0.1} ${w*0.2} ${h*0.1} L ${w*0.8} ${h*0.1} Q ${w*0.9} ${h*0.1} ${w*0.9} ${h*0.2} L ${w*0.9} ${h*0.6} Q ${w*0.9} ${h*0.7} ${w*0.8} ${h*0.7} L ${w*0.3} ${h*0.7} L ${w*0.2} ${h*0.9} L ${w*0.25} ${h*0.7} L ${w*0.2} ${h*0.7} Q ${w*0.1} ${h*0.7} ${w*0.1} ${h*0.6} Z`;
    
    case 'dog':
      return `M ${w*0.2} ${h*0.3} C ${w*0.1} ${h*0.2} ${w*0.1} ${h*0.1} ${w*0.2} ${h*0.1} L ${w*0.25} ${h*0.05} C ${w*0.3} ${h*0.02} ${w*0.35} ${h*0.05} ${w*0.4} ${h*0.1} L ${w*0.6} ${h*0.1} C ${w*0.65} ${h*0.05} ${w*0.7} ${h*0.02} ${w*0.75} ${h*0.05} L ${w*0.8} ${h*0.1} C ${w*0.9} ${h*0.1} ${w*0.9} ${h*0.2} ${w*0.8} ${h*0.3} C ${w*0.85} ${h*0.4} ${w*0.85} ${h*0.5} ${w*0.8} ${h*0.6} C ${w*0.75} ${h*0.8} ${w*0.6} ${h*0.9} ${w*0.5} ${h*0.9} C ${w*0.4} ${h*0.9} ${w*0.25} ${h*0.8} ${w*0.2} ${h*0.6} C ${w*0.15} ${h*0.5} ${w*0.15} ${h*0.4} ${w*0.2} ${h*0.3} Z M ${w*0.35} ${h*0.4} C ${w*0.32} ${h*0.37} ${w*0.32} ${h*0.43} ${w*0.35} ${h*0.4} M ${w*0.65} ${h*0.4} C ${w*0.68} ${h*0.37} ${w*0.68} ${h*0.43} ${w*0.65} ${h*0.4} M ${w*0.45} ${h*0.55} L ${w*0.5} ${h*0.6} L ${w*0.55} ${h*0.55}`;
    
    case 'cat':
      return `M ${w*0.2} ${h*0.1} L ${w*0.35} ${h*0.3} C ${w*0.4} ${h*0.25} ${w*0.6} ${h*0.25} ${w*0.65} ${h*0.3} L ${w*0.8} ${h*0.1} C ${w*0.85} ${h*0.15} ${w*0.85} ${h*0.25} ${w*0.8} ${h*0.35} C ${w*0.85} ${h*0.5} ${w*0.85} ${h*0.65} ${w*0.8} ${h*0.8} C ${w*0.7} ${h*0.9} ${w*0.3} ${h*0.9} ${w*0.2} ${h*0.8} C ${w*0.15} ${h*0.65} ${w*0.15} ${h*0.5} ${w*0.2} ${h*0.35} C ${w*0.15} ${h*0.25} ${w*0.15} ${h*0.15} ${w*0.2} ${h*0.1} Z M ${w*0.35} ${h*0.45} C ${w*0.32} ${h*0.42} ${w*0.32} ${h*0.48} ${w*0.35} ${h*0.45} M ${w*0.65} ${h*0.45} C ${w*0.68} ${h*0.42} ${w*0.68} ${h*0.48} ${w*0.65} ${h*0.45}`;
    
    case 'smiley': {
      const smileyCx = w / 2, smileyCy = h / 2, smileyR = Math.min(w, h) / 2 * 0.9;
      const eyeRadius = smileyR * 0.08, leftEyeX = smileyCx - smileyR * 0.3, rightEyeX = smileyCx + smileyR * 0.3, eyeY = smileyCy - smileyR * 0.2;
      return `M ${smileyCx - smileyR} ${smileyCy} A ${smileyR} ${smileyR} 0 1 0 ${smileyCx + smileyR} ${smileyCy} A ${smileyR} ${smileyR} 0 1 0 ${smileyCx - smileyR} ${smileyCy} M ${leftEyeX - eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${leftEyeX + eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${leftEyeX - eyeRadius} ${eyeY} Z M ${rightEyeX - eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${rightEyeX + eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${rightEyeX - eyeRadius} ${eyeY} Z M ${smileyCx - smileyR*0.4} ${smileyCy + smileyR*0.2} Q ${smileyCx} ${smileyCy + smileyR*0.5} ${smileyCx + smileyR*0.4} ${smileyCy + smileyR*0.2}`;
    }
    
    default:
      return '';
  }
}

/**
 * Generates Zigzag path for an element
 * @param {Object} element - Element object with type, width, height, etc.
 * @param {Object} options - Options object with { document?, zoom? }
 * @returns {string} SVG path string
 */
function generateZigzagPath(element, options = {}) {
  const { document } = options;
  
  // For shapes (not line/brush), use borderWidth; for line/brush, use strokeWidth
  const strokeWidth = (element.type === 'line' || element.type === 'brush')
    ? (element.strokeWidth || 0)
    : (element.borderWidth || element.strokeWidth || 0);
  
  const isTextboxBorder = element.id && element.id.includes('-border');
  
  // For zigzag, use strokeWidth / 2 for zigzag size/thickness to maintain normal scaling
  // while strokeWidth itself scales faster (max 40px instead of 20px)
  const zigzagBaseWidth = strokeWidth / 2;
  const zigzagSize = isTextboxBorder ? Math.max(8, zigzagBaseWidth * 1.5) : Math.max(12, zigzagBaseWidth * 2);
  const thickness = isTextboxBorder ? Math.max(2, zigzagBaseWidth * 0.8) : Math.max(3, zigzagBaseWidth * 1.2);
  
  if (element.type === 'line') {
    const length = Math.sqrt(element.width * element.width + element.height * element.height);
    const segments = Math.max(2, Math.floor(length / zigzagSize));
    
    let path = `M 0 0`;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = element.width * t;
      const y = element.height * t;
      const offset = (i % 2 === 0) ? 0 : thickness;
      path += ` L ${x} ${y + offset}`;
    }
    return path;
  }
  
  if (element.type === 'triangle' || element.type === 'polygon') {
    const path = generateComplexShapePath(element);
    const perimeter = element.type === 'triangle' ? 
      element.width + element.height + Math.sqrt(element.width * element.width + element.height * element.height) :
      2 * Math.PI * Math.min(element.width, element.height) / 2;
    const segments = Math.max(4, Math.floor(perimeter / zigzagSize));
    
    // Use document.createElementNS if available (for getTotalLength)
    let pathLength = perimeter;
    if (document && document.createElementNS) {
      try {
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', path);
        if (pathEl.getTotalLength) {
          pathLength = pathEl.getTotalLength();
        }
      } catch (error) {
        // Fallback to perimeter if DOM operation fails
        console.warn('[styles-engine] Failed to calculate path length, using perimeter:', error);
      }
    }
    
    let zigzagPath = '';
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * pathLength;
      let point = { x: 0, y: 0 };
      
      // Try to get point at length if document is available
      if (document && document.createElementNS) {
        try {
          const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          pathEl.setAttribute('d', path);
          if (pathEl.getPointAtLength) {
            point = pathEl.getPointAtLength(t);
          }
        } catch (error) {
          // Fallback: approximate point based on perimeter
          // This is a simplified approximation
        }
      }
      
      const offset = (i % 2 === 0) ? 0 : thickness;
      if (i === 0) zigzagPath += `M ${point.x} ${point.y}`;
      else zigzagPath += ` L ${point.x + offset} ${point.y + offset}`;
    }
    return zigzagPath + ' Z';
  } else if (element.type === 'rect') {
    const perimeter = 2 * (element.width + element.height);
    const segments = Math.max(4, Math.floor(perimeter / zigzagSize));
    
    let path = 'M 0 0';
    for (let i = 1; i <= segments; i++) {
      const t = (i / segments) * perimeter;
      let x, y;
      
      if (t <= element.width) {
        x = t;
        y = 0;
      } else if (t <= element.width + element.height) {
        x = element.width;
        y = t - element.width;
      } else if (t <= 2 * element.width + element.height) {
        x = element.width - (t - element.width - element.height);
        y = element.height;
      } else {
        x = 0;
        y = element.height - (t - 2 * element.width - element.height);
      }
      
      const offset = (i % 2 === 0) ? thickness : -thickness;
      path += ` L ${x + offset} ${y + offset}`;
    }
    return path + ' Z';
  }
  
  if (element.type === 'circle') {
    const cx = element.width / 2;
    const cy = element.height / 2;
    const radius = Math.min(element.width, element.height) / 2;
    const segments = Math.max(8, Math.floor((2 * Math.PI * radius) / zigzagSize));
    
    let path = '';
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const r = radius + ((i % 2 === 0) ? 0 : thickness);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      
      if (i === 0) path += `M ${x} ${y}`;
      else path += ` L ${x} ${y}`;
    }
    return path + ' Z';
  }
  
  if (element.type === 'brush' && element.points) {
    let path = `M ${element.points[0]} ${element.points[1]}`;
    for (let i = 2; i < element.points.length; i += 2) {
      const offset = ((i / 2) % 2 === 0) ? 0 : thickness;
      path += ` L ${element.points[i]} ${element.points[i + 1] + offset}`;
    }
    return path;
  }
  
  // Fallback: return empty path or default path
  return '';
}

/**
 * Generates default path for an element
 * @param {Object} element - Element object
 * @param {Object} options - Options object
 * @returns {string} SVG path string
 */
function generateDefaultPath(element, options = {}) {
  if (element.type === 'rect') {
    if (element.cornerRadius && element.cornerRadius > 0) {
      const r = Math.min(element.cornerRadius, element.width / 2, element.height / 2);
      return `M ${r} 0 L ${element.width - r} 0 Q ${element.width} 0 ${element.width} ${r} L ${element.width} ${element.height - r} Q ${element.width} ${element.height} ${element.width - r} ${element.height} L ${r} ${element.height} Q 0 ${element.height} 0 ${element.height - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
    }
    return `M 0 0 L ${element.width} 0 L ${element.width} ${element.height} L 0 ${element.height} Z`;
  } else if (element.type === 'circle') {
    const r = Math.min(element.width, element.height) / 2;
    const cx = element.width / 2, cy = element.height / 2;
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`;
  } else if (element.type === 'line') {
    return `M 0 0 L ${element.width} ${element.height}`;
  } else if (element.type === 'brush' && element.points) {
    let pathString = `M ${element.points[0]} ${element.points[1]}`;
    for (let i = 2; i < element.points.length; i += 2) {
      pathString += ` L ${element.points[i]} ${element.points[i + 1]}`;
    }
    return pathString;
  }
  return generateComplexShapePath(element);
}

/**
 * Generates rough path using rough.js
 * @param {Object} element - Element object
 * @param {Object} options - Options object with { roughInstance, document, zoom }
 * @returns {string} SVG path string
 */
function generateRoughPath(element, options = {}) {
  const { roughInstance, document, zoom = 1 } = options;
  
  if (!roughInstance || !document) {
    console.warn('[styles-engine] Rough.js not available, falling back to default style');
    return generateDefaultPath(element, options);
  }
  
  const roughness = element.roughness || 1;
  // For shapes (not line/brush), use borderWidth; for line/brush, use strokeWidth
  const strokeWidth = (element.type === 'line' || element.type === 'brush')
    ? (element.strokeWidth ? element.strokeWidth * zoom : 0)
    : ((element.borderWidth || element.strokeWidth) ? (element.borderWidth || element.strokeWidth) * zoom : 0);
  const stroke = element.stroke || '#1f2937';
  const fill = element.fill || 'transparent';
  const seed = element.seed !== undefined ? element.seed : (parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1);
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const rc = roughInstance.svg(svg);
  
  try {
    let roughElement;
    
    if (element.type === 'rect') {
      if (element.cornerRadius && element.cornerRadius > 0) {
        const r = Math.min(element.cornerRadius, element.width / 2, element.height / 2);
        const roundedRectPath = `M ${r} 0 L ${element.width - r} 0 Q ${element.width} 0 ${element.width} ${r} L ${element.width} ${element.height - r} Q ${element.width} ${element.height} ${element.width - r} ${element.height} L ${r} ${element.height} Q 0 ${element.height} 0 ${element.height - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
        roughElement = rc.path(roundedRectPath, {
          roughness, strokeWidth, stroke, fill: fill !== 'transparent' ? fill : undefined, fillStyle: 'solid', seed
        });
      } else {
        roughElement = rc.rectangle(0, 0, element.width, element.height, {
          roughness, strokeWidth, stroke, fill: fill !== 'transparent' ? fill : undefined, fillStyle: 'solid', seed
        });
      }
    } else if (element.type === 'circle') {
      const radius = Math.min(element.width, element.height) / 2;
      roughElement = rc.circle(element.width / 2, element.height / 2, radius * 2, {
        roughness, strokeWidth, stroke, fill: fill !== 'transparent' ? fill : undefined, fillStyle: 'solid', seed
      });
    } else if (element.type === 'line') {
      roughElement = rc.line(0, 0, element.width, element.height, { roughness, strokeWidth, stroke, seed });
    } else if (element.type === 'brush' && element.points) {
      const pathPoints = [];
      for (let i = 0; i < element.points.length; i += 2) {
        pathPoints.push([element.points[i], element.points[i + 1]]);
      }
      if (pathPoints.length > 1) {
        let pathString = `M ${pathPoints[0][0]} ${pathPoints[0][1]}`;
        for (let i = 1; i < pathPoints.length; i++) {
          pathString += ` L ${pathPoints[i][0]} ${pathPoints[i][1]}`;
        }
        roughElement = rc.path(pathString, { roughness, strokeWidth, stroke, seed });
      }
    } else {
      const complexPath = generateComplexShapePath(element);
      if (complexPath) {
        roughElement = rc.path(complexPath, { roughness, strokeWidth, stroke, fill: fill !== 'transparent' ? fill : undefined, fillStyle: 'solid', seed });
      }
    }
    
    if (roughElement) {
      const paths = roughElement.querySelectorAll('path');
      let combinedPath = '';
      paths.forEach(path => {
        const d = path.getAttribute('d');
        if (d) combinedPath += d + ' ';
      });
      return combinedPath.trim();
    }
  } catch (error) {
    console.error('[styles-engine] Error generating rough path:', error);
  }
  
  return generateDefaultPath(element, options);
}

/**
 * Generates glow path (same as default, but with special stroke props)
 * @param {Object} element - Element object
 * @param {Object} options - Options object
 * @returns {string} SVG path string
 */
function generateGlowPath(element, options = {}) {
  return generateDefaultPath(element, options);
}

/**
 * Generates candy path (circles along the path)
 * @param {Object} element - Element object
 * @param {Object} options - Options object with { document }
 * @returns {string} SVG path string
 */
function generateCandyPath(element, options = {}) {
  const { document } = options;
  
  // Revert to original circle size calculation
  const baseCircleSize = element.strokeWidth ? element.strokeWidth * 2 : 4;
  // Apply spacing multiplier if provided (server-side only, to reduce gaps between circles)
  const spacingMultiplier = element.candySpacingMultiplier ?? 1;
  const spacing = baseCircleSize * 2 * spacingMultiplier;
  const hasRandomness = element.candyRandomness || false;
  const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 4), 10) || 1;
  
  const getVariationAmount = () => {
    if (!hasRandomness) return 0;
    const intensity = element.candyIntensity || 'weak';
    switch (intensity) {
      case 'middle': return 1.0;
      case 'strong': return 1.4;
      default: return 0.7;
    }
  };
  
  let pathString = '';
  let circleIndex = 0;
  
  if (element.type === 'line') {
    // Performante gestrichelte Linie statt viele Kreise rendern
    // Die gestrichelte Darstellung erfolgt über strokeDasharray in getStrokeProps
    return `M 0 0 L ${element.width} ${element.height}`;
  } else if (element.type === 'rect') {
    const topCircles = Math.max(1, Math.floor(element.width / spacing));
    const rightCircles = Math.max(1, Math.floor(element.height / spacing));
    const bottomCircles = Math.max(1, Math.floor(element.width / spacing));
    const leftCircles = Math.max(1, Math.floor(element.height / spacing));
    
    const sides = [
      { count: topCircles, getPos: (i) => ({ x: (i + 0.5) * element.width / topCircles, y: 0 }) },
      { count: rightCircles, getPos: (i) => ({ x: element.width, y: (i + 0.5) * element.height / rightCircles }) },
      { count: bottomCircles, getPos: (i) => ({ x: element.width - (i + 0.5) * element.width / bottomCircles, y: element.height }) },
      { count: leftCircles, getPos: (i) => ({ x: 0, y: element.height - (i + 0.5) * element.height / leftCircles }) }
    ];
    
    sides.forEach(side => {
      for (let i = 0; i < side.count; i++) {
        const { x, y } = side.getPos(i);
        
        const random = () => {
          const x = Math.sin(seed + circleIndex) * 10000;
          return x - Math.floor(x);
        };
        const sizeVariation = hasRandomness ? 1 + (random() - 0.5) * getVariationAmount() : 1;
        const radius = (baseCircleSize * sizeVariation) / 2;
        
        pathString += `M ${x - radius} ${y} A ${radius} ${radius} 0 1 0 ${x + radius} ${y} A ${radius} ${radius} 0 1 0 ${x - radius} ${y} `;
        circleIndex++;
      }
    });
  } else if (element.type === 'triangle' || element.type === 'polygon') {
    const path = generateComplexShapePath(element);
    const perimeter = element.type === 'triangle' ? 
      element.width + element.height + Math.sqrt(element.width * element.width + element.height * element.height) :
      2 * Math.PI * Math.min(element.width, element.height) / 2;
    const numCircles = Math.max(3, Math.floor(perimeter / spacing));
    
    let pathLength = perimeter;
    if (document && document.createElementNS) {
      try {
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', path);
        if (pathEl.getTotalLength) {
          pathLength = pathEl.getTotalLength();
        }
      } catch (error) {
        // Fallback to perimeter
      }
    }
    
    for (let i = 0; i < numCircles; i++) {
      const t = (i / numCircles) * pathLength;
      let point = { x: 0, y: 0 };
      
      if (document && document.createElementNS) {
        try {
          const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          pathEl.setAttribute('d', path);
          if (pathEl.getPointAtLength) {
            point = pathEl.getPointAtLength(t);
          }
        } catch (error) {
          // Fallback
        }
      }
      
      const random = () => {
        const x = Math.sin(seed + circleIndex) * 10000;
        return x - Math.floor(x);
      };
      const sizeVariation = hasRandomness ? 1 + (random() - 0.5) * getVariationAmount() : 1;
      const radius = (baseCircleSize * sizeVariation) / 2;
      
      pathString += `M ${point.x - radius} ${point.y} A ${radius} ${radius} 0 1 0 ${point.x + radius} ${point.y} A ${radius} ${radius} 0 1 0 ${point.x - radius} ${point.y} `;
      circleIndex++;
    }
  } else if (element.type === 'circle') {
    const cx = element.width / 2;
    const cy = element.height / 2;
    const radius = Math.min(element.width, element.height) / 2;
    const circumference = 2 * Math.PI * radius;
    const numCircles = Math.floor(circumference / spacing);
    
    for (let i = 0; i < numCircles; i++) {
      const angle = (i / numCircles) * Math.PI * 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      
      const random = () => {
        const x = Math.sin(seed + i) * 10000;
        return x - Math.floor(x);
      };
      const sizeVariation = hasRandomness ? 1 + (random() - 0.5) * getVariationAmount() : 1;
      const circleRadius = (baseCircleSize * sizeVariation) / 2;
      
      pathString += `M ${x - circleRadius} ${y} A ${circleRadius} ${circleRadius} 0 1 0 ${x + circleRadius} ${y} A ${circleRadius} ${circleRadius} 0 1 0 ${x - circleRadius} ${y} `;
    }
  } else if (element.type === 'brush' && element.points) {
    // Distribute circles evenly along the path based on distance
    const points = element.points;
    if (points.length >= 4) {
      const circles = [];
      let totalDistance = 0;
      
      // Calculate total path length
      for (let i = 2; i < points.length; i += 2) {
        const dx = points[i] - points[i - 2];
        const dy = points[i + 1] - points[i - 1];
        totalDistance += Math.sqrt(dx * dx + dy * dy);
      }
      
      const targetSpacing = spacing;
      const numCircles = Math.max(1, Math.floor(totalDistance / targetSpacing));
      
      let currentDistance = 0;
      let circleIndex = 0;
      
      for (let i = 2; i < points.length && circleIndex < numCircles; i += 2) {
        const dx = points[i] - points[i - 2];
        const dy = points[i + 1] - points[i - 1];
        const segmentLength = Math.sqrt(dx * dx + dy * dy);
        
        while (circleIndex * targetSpacing <= currentDistance + segmentLength && circleIndex < numCircles) {
          const t = (circleIndex * targetSpacing - currentDistance) / segmentLength;
          const x = points[i - 2] + dx * t;
          const y = points[i - 1] + dy * t;
          
          const random = () => {
            const x = Math.sin(seed + circleIndex) * 10000;
            return x - Math.floor(x);
          };
          const sizeVariation = hasRandomness ? 1 + (random() - 0.5) * getVariationAmount() : 1;
          const radius = (baseCircleSize * sizeVariation) / 2;
          
          pathString += `M ${x - radius} ${y} A ${radius} ${radius} 0 1 0 ${x + radius} ${y} A ${radius} ${radius} 0 1 0 ${x - radius} ${y} `;
          circleIndex++;
        }
        
        currentDistance += segmentLength;
      }
    }
  }
  
  return pathString;
}

/**
 * Generates wobbly path (varying stroke width)
 * @param {Object} element - Element object
 * @param {Object} options - Options object with { zoom }
 * @returns {string} SVG path string
 */
function generateWobblyPath(element, options = {}) {
  const { zoom = 1 } = options;
  const baseWidth = element.strokeWidth ? element.strokeWidth * zoom : 0;
  
  if (element.type === 'line') {
    const topPath = [];
    const bottomPath = [];
    const steps = 20;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const widthVariation = 1 + 0.15 * Math.sin(t * Math.PI * 8);
      const currentWidth = baseWidth * widthVariation;
      
      const x = element.width * t;
      const y = element.height * t;
      
      const dx = element.width;
      const dy = element.height;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length > 0) {
        const nx = -dy / length;
        const ny = dx / length;
        const halfWidth = currentWidth / 2;
        
        topPath.push([x + nx * halfWidth, y + ny * halfWidth]);
        bottomPath.unshift([x - nx * halfWidth, y - ny * halfWidth]);
      }
    }
    
    if (topPath.length > 0) {
      let pathString = `M ${topPath[0][0]} ${topPath[0][1]}`;
      for (let i = 1; i < topPath.length; i++) {
        pathString += ` L ${topPath[i][0]} ${topPath[i][1]}`;
      }
      for (let i = 0; i < bottomPath.length; i++) {
        pathString += ` L ${bottomPath[i][0]} ${bottomPath[i][1]}`;
      }
      pathString += ' Z';
      return pathString;
    }
  }
  
  if (element.type === 'rect') {
    const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
    let seedCounter = seed;
    const random = () => {
      const x = Math.sin(seedCounter++) * 10000;
      return x - Math.floor(x);
    };
    
    const deviation = baseWidth * 0.5;
    const brushStrokes = [];
    
    // Simulate hand-drawn rectangle with 4 brush strokes (extended to connect)
    const overlap = 164;
    const edges = [
      { start: [element.width, -overlap], end: [element.width, element.height + overlap] },
      { start: [0, element.height + overlap], end: [0, -overlap] },
      { start: [-overlap, 0], end: [element.width + overlap, 0] },
      { start: [element.width + overlap, element.height], end: [-overlap, element.height] }
    ];
    
    edges.forEach(edge => {
      const points = [];
      const steps = 15;
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = edge.start[0] + (edge.end[0] - edge.start[0]) * t;
        const y = edge.start[1] + (edge.end[1] - edge.start[1]) * t;
        
        const deviationX = (random() - 0.5) * deviation;
        const deviationY = (random() - 0.5) * deviation;
        
        points.push(x + deviationX, y + deviationY);
      }
      
      const topPath = [];
      const bottomPath = [];
      
      for (let i = 0; i < points.length - 2; i += 2) {
        const t = i / (points.length - 2);
        const widthVariation = 1 + 0.15 * Math.sin(t * Math.PI * 8);
        const currentWidth = baseWidth * widthVariation;
        
        const x = points[i];
        const y = points[i + 1];
        const nextX = points[i + 2] || x;
        const nextY = points[i + 3] || y;
        
        const dx = nextX - x;
        const dy = nextY - y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length > 0) {
          const nx = -dy / length;
          const ny = dx / length;
          const halfWidth = currentWidth / 2;
          
          topPath.push([x + nx * halfWidth, y + ny * halfWidth]);
          bottomPath.unshift([x - nx * halfWidth, y - ny * halfWidth]);
        }
      }
      
      if (topPath.length > 0) {
        let strokePath = `M ${topPath[0][0]} ${topPath[0][1]}`;
        for (let i = 1; i < topPath.length; i++) {
          strokePath += ` L ${topPath[i][0]} ${topPath[i][1]}`;
        }
        for (let i = 0; i < bottomPath.length; i++) {
          strokePath += ` L ${bottomPath[i][0]} ${bottomPath[i][1]}`;
        }
        strokePath += ' Z';
        brushStrokes.push(strokePath);
      }
    });
    
    return brushStrokes.join(' ');
  }
  
  if (element.type === 'circle') {
    const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
    let seedCounter = seed;
    const random = () => {
      const x = Math.sin(seedCounter++) * 10000;
      return x - Math.floor(x);
    };
    
    const cx = element.width / 2;
    const cy = element.height / 2;
    const radius = Math.min(element.width, element.height) / 2;
    const deviation = baseWidth * 0.3;
    const steps = 60;
    
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      
      const deviationX = (random() - 0.5) * deviation;
      const deviationY = (random() - 0.5) * deviation;
      
      points.push(x + deviationX, y + deviationY);
    }
    
    const topPath = [];
    const bottomPath = [];
    
    for (let i = 0; i < points.length - 1; i += 2) {
      const t = i / (points.length - 2);
      const widthVariation = 1 + 0.15 * Math.sin(t * Math.PI * 12);
      const currentWidth = baseWidth * widthVariation;
      
      const x = points[i];
      const y = points[i + 1];
      const nextX = i + 2 < points.length ? points[i + 2] : points[0];
      const nextY = i + 3 < points.length ? points[i + 3] : points[1];
      
      const dx = nextX - x;
      const dy = nextY - y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length > 0) {
        const nx = -dy / length;
        const ny = dx / length;
        const halfWidth = currentWidth / 2;
        
        topPath.push([x + nx * halfWidth, y + ny * halfWidth]);
        bottomPath.unshift([x - nx * halfWidth, y - ny * halfWidth]);
      }
    }
    
    if (topPath.length > 0) {
      let pathString = `M ${topPath[0][0]} ${topPath[0][1]}`;
      for (let i = 1; i < topPath.length; i++) {
        pathString += ` L ${topPath[i][0]} ${topPath[i][1]}`;
      }
      for (let i = 0; i < bottomPath.length; i++) {
        pathString += ` L ${bottomPath[i][0]} ${bottomPath[i][1]}`;
      }
      pathString += ' Z';
      return pathString;
    }
  }
  
  if (element.type === 'brush' && element.points) {
    const topPath = [];
    const bottomPath = [];
    
    for (let i = 0; i < element.points.length - 2; i += 2) {
      const t = i / (element.points.length - 2);
      const widthVariation = 1 + 0.15 * Math.sin(t * Math.PI * 8);
      const currentWidth = baseWidth * widthVariation;
      
      const x = element.points[i];
      const y = element.points[i + 1];
      const nextX = element.points[i + 2] || x;
      const nextY = element.points[i + 3] || y;
      
      const dx = nextX - x;
      const dy = nextY - y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length > 0) {
        const nx = -dy / length;
        const ny = dx / length;
        const halfWidth = currentWidth / 2;
        
        topPath.push([x + nx * halfWidth, y + ny * halfWidth]);
        bottomPath.unshift([x - nx * halfWidth, y - ny * halfWidth]);
      }
    }
    
    if (topPath.length > 0) {
      let pathString = `M ${topPath[0][0]} ${topPath[0][1]}`;
      for (let i = 1; i < topPath.length; i++) {
        pathString += ` L ${topPath[i][0]} ${topPath[i][1]}`;
      }
      for (let i = 0; i < bottomPath.length; i++) {
        pathString += ` L ${bottomPath[i][0]} ${bottomPath[i][1]}`;
      }
      pathString += ' Z';
      return pathString;
    }
  }
  
  return generateDefaultPath(element, options);
}

/**
 * Gets stroke properties for an element based on style
 * @param {Object} element - Element object
 * @param {string} style - Style name
 * @param {Object} options - Options object
 * @returns {Object} Stroke properties object
 */
/**
 * Offsets all point coordinates in an SVG path by (dx, dy)
 * Handles M, L, Q, C, A commands (A: only endpoint, not rx/ry)
 */
function offsetPathBy(path, dx, dy) {
  if (!path || path.trim() === '') return path;
  let result = path
    .replace(/M\s+([-\d.]+)\s+([-\d.]+)/g, (_, x, y) => `M ${parseFloat(x) + dx} ${parseFloat(y) + dy}`)
    .replace(/L\s+([-\d.]+)\s+([-\d.]+)/g, (_, x, y) => `L ${parseFloat(x) + dx} ${parseFloat(y) + dy}`)
    .replace(/Q\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/g, (_, x1, y1, x, y) =>
      `Q ${parseFloat(x1) + dx} ${parseFloat(y1) + dy} ${parseFloat(x) + dx} ${parseFloat(y) + dy}`)
    .replace(/C\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/g, (_, x1, y1, x2, y2, x, y) =>
      `C ${parseFloat(x1) + dx} ${parseFloat(y1) + dy} ${parseFloat(x2) + dx} ${parseFloat(y2) + dy} ${parseFloat(x) + dx} ${parseFloat(y) + dy}`)
    .replace(/A\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([01])\s+([01])\s+([-\d.]+)\s+([-\d.]+)/g, (_, rx, ry, rot, la, sweep, x, y) =>
      `A ${rx} ${ry} ${rot} ${la} ${sweep} ${parseFloat(x) + dx} ${parseFloat(y) + dy}`);
  return result;
}

/**
 * fabric.util.getRandom compatibility – seeded random for reproducibility
 * getRandom(max) or getRandom(max, min)
 */
function getRandom(max, min) {
  if (min === undefined) min = 0;
  return Math.random() * (max - min) + min;
}

/**
 * fabric.util.clamp compatibility
 */
function clamp(val, high, low) {
  return Math.max(low, Math.min(high, val));
}

/**
 * Adds perpendicular jitter to path points to simulate hand-drawn wobble.
 * @param {Array<{x:number,y:number}>} points - Sampled points along the path
 * @param {number} jitterAmount - Max perpendicular offset in px
 * @param {Function} seededRandom - (offset) => 0..1
 * @param {boolean} isClosed - Whether path is closed (rect, circle)
 * @returns {Array<{x:number,y:number}>} Jittered points
 */
function addPathJitter(points, jitterAmount, seededRandom, isClosed) {
  if (points.length < 2) return points;
  const result = points.map((p) => ({ x: p.x, y: p.y }));
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const prev = isClosed ? points[(i - 1 + n) % n] : points[Math.max(0, i - 1)];
    const next = isClosed ? points[(i + 1) % n] : points[Math.min(n - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / len;
    const perpY = dx / len;
    const jitter = (seededRandom(i * 31) * 2 - 1) * jitterAmount;
    result[i].x += perpX * jitter;
    result[i].y += perpY * jitter;
  }
  return result;
}

/**
 * Adds outward offset to points for closed shapes (borders extending beyond edges).
 * @param {Array<{x:number,y:number}>} points - Path points
 * @param {number} offsetAmount - Outward offset in px
 * @param {Function} seededRandom - (offset) => 0..1
 * @returns {Array<{x:number,y:number}>} Points with outward offset
 */
function addOutwardOffset(points, offsetAmount, seededRandom) {
  if (points.length < 2 || offsetAmount <= 0) return points;
  const result = points.map((p) => ({ x: p.x, y: p.y }));
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpOutX = dy / len;
    const perpOutY = -dx / len;
    const variation = 0.5 + seededRandom(i * 47) * 0.5;
    result[i].x += perpOutX * offsetAmount * variation;
    result[i].y += perpOutY * offsetAmount * variation;
  }
  return result;
}

/**
 * Builds smooth SVG path from points for an OPEN segment (e.g. one rect side).
 * Uses quadratic Bézier (Q) with max 3 subtle direction changes. Very low curveAmount.
 * @param {Array<{x:number,y:number}>} points - 5 points: start, 25%, 50%, 75%, end
 * @param {Function} seededRandom - (offset) => 0..1
 * @param {number} curveAmount - Max control-point offset (px), keep very low (~0.5)
 * @returns {string} SVG path string
 */
function pointsToSmoothPathOpen(points, seededRandom, curveAmount = 0.5) {
  if (points.length < 2) return '';
  let pathStr = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / len;
    const perpY = dx / len;
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    const curveOffset = (seededRandom(i * 23) * 2 - 1) * curveAmount;
    const cpx = midX + perpX * curveOffset;
    const cpy = midY + perpY * curveOffset;
    pathStr += ` Q ${cpx} ${cpy} ${curr.x} ${curr.y}`;
  }
  return pathStr;
}

/**
 * Builds smooth SVG path from points using quadratic Bézier (Q) instead of straight lines.
 * @param {Array<{x:number,y:number}>} points - Path points
 * @param {Function} seededRandom - (offset) => 0..1
 * @param {boolean} isClosed - Whether path is closed
 * @param {number} curveAmount - Max control-point offset for organic curves (px)
 * @returns {string} SVG path string
 */
function pointsToSmoothPath(points, seededRandom, isClosed, curveAmount = 3) {
  if (points.length < 2) return '';
  const n = points.length;
  let pathStr = `M ${points[0].x} ${points[0].y}`;
  const lastIdx = isClosed ? n : n - 1;
  for (let i = 1; i <= lastIdx; i++) {
    const idx = i % n;
    const prev = points[(i - 1 + n) % n];
    const curr = points[idx];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / len;
    const perpY = dx / len;
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    const curveOffset = (seededRandom(i * 23 + idx * 7) * 2 - 1) * curveAmount;
    const cpx = midX + perpX * curveOffset;
    const cpy = midY + perpY * curveOffset;
    pathStr += ` Q ${cpx} ${cpy} ${curr.x} ${curr.y}`;
  }
  if (isClosed) pathStr += ' Z';
  return pathStr;
}

/**
 * Converts straight path to hand-drawn style: samples points, adds jitter, rebuilds path.
 * @param {string} basePath - Original SVG path
 * @param {Object} element - Element with type, width, height
 * @param {Object} options - { document, stepSize }
 * @param {number} jitterAmount - Perpendicular wobble in px
 * @param {Function} seededRandom - (offset) => 0..1
 * @param {boolean} isClosed - rect/circle = true, line = false
 * @returns {string} Jittered path string
 */
function jitterPath(basePath, element, options, jitterAmount, seededRandom, isClosed) {
  const { document } = options;
  const stepSize = options.stepSize || 12;
  let points = [];
  if (document && document.createElementNS) {
    try {
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', basePath);
      if (pathEl.getTotalLength) {
        const pathLength = pathEl.getTotalLength();
        const stepNum = Math.max(2, Math.min(50, Math.floor(pathLength / stepSize) + 1));
        for (let j = 0; j <= stepNum; j++) {
          const t = (stepNum > 0 ? j / stepNum : 0) * pathLength;
          const pt = pathEl.getPointAtLength(t);
          points.push({ x: pt.x, y: pt.y });
        }
      }
    } catch (_e) { /* fallback */ }
  }
  if (points.length === 0) {
    if (element.type === 'line') {
      const len = Math.sqrt(element.width * element.width + element.height * element.height);
      const stepNum = Math.max(2, Math.min(50, Math.floor(len / stepSize) + 1));
      for (let j = 0; j <= stepNum; j++) {
        const t = stepNum > 0 ? j / stepNum : 0;
        points.push({ x: element.width * t, y: element.height * t });
      }
    } else if (element.type === 'rect') {
      const w = element.width || 0;
      const h = element.height || 0;
      const perim = 2 * (w + h);
      const stepNum = Math.max(2, Math.min(50, Math.floor(perim / stepSize) + 1));
      for (let j = 0; j <= stepNum; j++) {
        const t = (stepNum > 0 ? j / stepNum : 0) * perim;
        if (t <= w) points.push({ x: t, y: 0 });
        else if (t <= w + h) points.push({ x: w, y: t - w });
        else if (t <= 2 * w + h) points.push({ x: 2 * w + h - t, y: h });
        else points.push({ x: 0, y: perim - t });
      }
    } else {
      return basePath;
    }
  }
  const jittered = addPathJitter(points, jitterAmount, seededRandom, isClosed);
  let pathStr = `M ${jittered[0].x} ${jittered[0].y}`;
  const lastIdx = isClosed ? jittered.length - 2 : jittered.length - 1;
  for (let i = 1; i <= lastIdx; i++) {
    pathStr += ` L ${jittered[i].x} ${jittered[i].y}`;
  }
  if (isClosed) pathStr += ' Z';
  return pathStr;
}

/**
 * MarkerBrush – fabric-brush algorithm
 * Multiple parallel strokes with diagonal offset, lineCap/lineJoin round, opacity 0.8
 * Uses jitterPath for hand-drawn wobble on straight lines.
 */
function generateMarkerPath(element, options = {}) {
  const basePath = generateDefaultPath(element, options);
  const strokeWidth = (element.type === 'line' || element.type === 'brush')
    ? (element.strokeWidth || 0)
    : (element.borderWidth || element.strokeWidth || 0);
  const lineWidth = 3;
  const baseWidth = 10;
  const size = Math.max(1, (strokeWidth || 4) + baseWidth);
  const numLayers = Math.max(1, Math.floor((size / lineWidth) / 2));
  const seed = parseInt(String(element.id || '1').replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
  const seededRandom = (offset) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };
  const isClosed = element.type !== 'line' && element.type !== 'brush';
  const jitterAmount = Math.max(0.8, (strokeWidth || 4) * 0.35);
  const jitteredPath = jitterPath(basePath, element, options, jitterAmount, seededRandom, isClosed);
  const paths = [];
  for (let i = 0; i < numLayers; i++) {
    const offset = (lineWidth - 1) * i;
    paths.push(offsetPathBy(jitteredPath, offset, offset));
  }
  return paths.join(' ');
}

/**
 * CrayonBrush – Waxy crayon effect with fine, tight frayed edges
 * Multiple offset strokes with controlled jitter create fine, dense fraying
 * Performance: 5-6 strokes per path (like Pencil)
 */
function generateCrayonPath(element, options = {}) {
  const { document } = options;
  const strokeWidth = (element.type === 'line' || element.type === 'brush')
    ? (element.strokeWidth || 0)
    : (element.borderWidth || element.strokeWidth || 0);
  
  const baseWidth = 20;
  const size = (strokeWidth || 4) / 2 + baseWidth;
  const seed = parseInt(String(element.id || '1').replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
  
  const seededRandom = (offset) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };
  
  const basePath = generateDefaultPath(element, options);
  
  // Get sample points along the path - more points for finer fraying
  let points = [];
  const stepSize = Math.max(1, Math.ceil(size / 4)); // Even smaller steps = much finer detail
  
  try {
    if (document && document.createElementNS) {
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', basePath);
      if (pathEl.getTotalLength) {
        const pathLength = pathEl.getTotalLength();
        const rawStepNum = Math.max(1, Math.floor(pathLength / stepSize) + 1);
        const stepNum = Math.min(500, rawStepNum); // Way more points for dense frays
        for (let j = 0; j <= stepNum; j++) {
          const t = (stepNum > 0 ? j / stepNum : 0) * pathLength;
          const pt = pathEl.getPointAtLength(t);
          points.push({ x: pt.x, y: pt.y });
        }
      }
    }
  } catch (_e) { /* fallback */ }
  
  if (points.length === 0) {
    if (element.type === 'line') {
      const len = Math.sqrt(element.width * element.width + element.height * element.height);
      const stepNum = Math.min(500, Math.max(1, Math.floor(len / stepSize) + 1));
      for (let j = 0; j <= stepNum; j++) {
        const t = stepNum > 0 ? j / stepNum : 0;
        points.push({ x: element.width * t, y: element.height * t });
      }
    } else if (element.type === 'rect') {
      const w = element.width || 0;
      const h = element.height || 0;
      const perim = 2 * (w + h);
      const rawStepNum = Math.max(1, Math.floor(perim / stepSize) + 1);
      const stepNum = Math.min(500, rawStepNum);
      for (let j = 0; j <= stepNum; j++) {
        const t = (stepNum > 0 ? j / stepNum : 0) * perim;
        if (t <= w) points.push({ x: t, y: 0 });
        else if (t <= w + h) points.push({ x: w, y: t - w });
        else if (t <= 2 * w + h) points.push({ x: 2 * w + h - t, y: h });
        else points.push({ x: 0, y: perim - t });
      }
    } else {
      return basePath;
    }
  }
  
  if (points.length < 2) return basePath;
  
  // Crayon effect: 8 strokes with aggressive jitter for wild, dense fraying
  const strokeNum = 8; // More strokes = denser, wilder fraying
  const range = size * 0.5; // More offset spread
  const jitterAmount = Math.max(3, size * 0.25); // Aggressive jitter = wild frays
  const curveAmount = 0.01; // Almost no curvature = sharp, pointy frays
  
  let pathString = '';
  
  for (let si = 0; si < strokeNum; si++) {
    const rx = seededRandom(si * 13) * range;
    const c = seededRandom(si * 17) * Math.PI * 2;
    const c0 = seededRandom(si * 19) * Math.PI * 2;
    const x0 = rx * Math.sin(c0);
    const y0 = (rx / 2) * Math.cos(c0);
    const cos = Math.cos(c);
    const sin = Math.sin(c);
    const offsetX = x0 * cos - y0 * sin;
    const offsetY = x0 * sin + y0 * cos;
    
    // Add fine, controlled jitter for tight fraying effect
    const jitteredPoints = points.map((p, idx) => {
      const jitterMagnitude = seededRandom(si * 100 + idx * 7) * jitterAmount;
      const jitterAngle = seededRandom(si * 150 + idx * 11) * Math.PI * 2;
      return {
        x: p.x + offsetX + Math.cos(jitterAngle) * jitterMagnitude,
        y: p.y + offsetY + Math.sin(jitterAngle) * jitterMagnitude
      };
    });
    
    // Generate path with gentle smoothing for natural fraying
    pathString += pointsToSmoothPath(jitteredPoints, seededRandom, false, curveAmount) + ' ';
  }
  
  return pathString.trim() || basePath;
}

/**
 * Generates Ink path for a rect as four separate overlapping sides (for textbox-style borders).
 * Each side: 5 points (start, 3 jitter at 25/50/75%, end), max 3 direction changes, very low jitter.
 * Sides extend past corners for overlap effect.
 */
function generatePencilRectFourSides(element, strokeWidth, seededRandom, strokeNum, range) {
  const sides = getRectOpenSides(element, strokeWidth);
  const jitterAmount = Math.max(0.2, (strokeWidth || 4) * 0.08);
  const curveAmount = Math.max(0.3, (strokeWidth || 4) * 0.06);
  let pathString = '';
  for (let si = 0; si < strokeNum; si++) {
    const rx = seededRandom(si * 13) * range;
    const c = seededRandom(si * 17) * Math.PI * 2;
    const c0 = seededRandom(si * 19) * Math.PI * 2;
    const x0 = rx * Math.sin(c0);
    const y0 = (rx / 2) * Math.cos(c0);
    const offsetX = x0 * Math.cos(c) - y0 * Math.sin(c);
    const offsetY = x0 * Math.sin(c) + y0 * Math.cos(c);
    for (let sideIdx = 0; sideIdx < sides.length; sideIdx++) {
      const side = sides[sideIdx];
      const base = buildOpenSidePoints(side, sideIdx, seededRandom, si, jitterAmount);
      const offsetPoints = base.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY }));
      pathString += pointsToSmoothPathOpen(offsetPoints, seededRandom, curveAmount) + ' ';
    }
  }
  return pathString.trim();
}

function getRectOpenSides(element, strokeWidth) {
  const w = element.width || 0;
  const h = element.height || 0;
  const overlap = Math.max(1, (strokeWidth || 4) * 0.3);

  return [
    { start: { x: -overlap, y: 0 }, end: { x: w + overlap, y: 0 }, perpX: 0, perpY: 1 },
    { start: { x: w, y: -overlap }, end: { x: w, y: h + overlap }, perpX: -1, perpY: 0 },
    { start: { x: w + overlap, y: h }, end: { x: -overlap, y: h }, perpX: 0, perpY: -1 },
    { start: { x: 0, y: h + overlap }, end: { x: 0, y: -overlap }, perpX: 1, perpY: 0 }
  ];
}

function buildOpenSidePoints(side, sideIdx, seededRandom, strokeIndex, jitterAmount) {
  const base = [side.start, null, null, null, side.end];

  for (let k = 1; k <= 3; k++) {
    const t = k / 4;
    base[k] = {
      x: side.start.x + (side.end.x - side.start.x) * t,
      y: side.start.y + (side.end.y - side.start.y) * t
    };
    const jitter = (seededRandom(sideIdx * 100 + k * 31 + strokeIndex * 7) * 2 - 1) * jitterAmount;
    base[k].x += side.perpX * jitter;
    base[k].y += side.perpY * jitter;
  }

  return base;
}

/**
 * Generates Paint Brush path for rect with optional wobbly edges
 * When paintBrushWobbly is enabled, each side gets a random skew/angle offset
 * to simulate hand-drawn inaccuracy (like in the user's reference image)
 */
function generatePaintBrushRectFourSides(element, strokeWidth, seededRandom, strokeNum, range) {
  const w = element.width || 0;
  const h = element.height || 0;
  const wobblyEdges = element.paintBrushWobbly || false;
  
  const sides = getRectOpenSides(element, strokeWidth);
  const jitterAmount = Math.max(0.2, (strokeWidth || 4) * 0.08);
  const curveAmount = Math.max(0.3, (strokeWidth || 4) * 0.06);
  
  // Wobbly edges: generate random angles/offsets for each side
  // These make the sides slightly skewed/rotated to simulate hand-drawn inaccuracy
  const wobblyAngles = wobblyEdges ? [
    (seededRandom(1000) - 0.5) * 0.08, // top: ±4.5 degrees max
    (seededRandom(2000) - 0.5) * 0.08, // right
    (seededRandom(3000) - 0.5) * 0.08, // bottom
    (seededRandom(4000) - 0.5) * 0.08  // left
  ] : [0, 0, 0, 0];
  
  const wobblyOffsets = wobblyEdges ? [
    { x: (seededRandom(5000) - 0.5) * strokeWidth * 2, y: (seededRandom(6000) - 0.5) * strokeWidth * 2 },
    { x: (seededRandom(7000) - 0.5) * strokeWidth * 2, y: (seededRandom(8000) - 0.5) * strokeWidth * 2 },
    { x: (seededRandom(9000) - 0.5) * strokeWidth * 2, y: (seededRandom(10000) - 0.5) * strokeWidth * 2 },
    { x: (seededRandom(11000) - 0.5) * strokeWidth * 2, y: (seededRandom(12000) - 0.5) * strokeWidth * 2 }
  ] : [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
  
  let pathString = '';
  
  for (let si = 0; si < strokeNum; si++) {
    const rx = seededRandom(si * 13) * range;
    const c = seededRandom(si * 17) * Math.PI * 2;
    const c0 = seededRandom(si * 19) * Math.PI * 2;
    const x0 = rx * Math.sin(c0);
    const y0 = (rx / 2) * Math.cos(c0);
    const offsetX = x0 * Math.cos(c) - y0 * Math.sin(c);
    const offsetY = x0 * Math.sin(c) + y0 * Math.cos(c);
    
    for (let sideIdx = 0; sideIdx < sides.length; sideIdx++) {
      const side = sides[sideIdx];
      const base = buildOpenSidePoints(side, sideIdx, seededRandom, si, jitterAmount);
      
      // Apply wobbly transformation if enabled
      let transformedPoints = base;
      if (wobblyEdges) {
        const angle = wobblyAngles[sideIdx];
        const offset = wobblyOffsets[sideIdx];
        
        // Calculate side center for rotation pivot
        const centerX = (side.start.x + side.end.x) / 2;
        const centerY = (side.start.y + side.end.y) / 2;
        
        transformedPoints = base.map(p => {
          // Rotate around side center
          const dx = p.x - centerX;
          const dy = p.y - centerY;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const rotatedX = dx * cos - dy * sin;
          const rotatedY = dx * sin + dy * cos;
          
          return {
            x: rotatedX + centerX + offset.x,
            y: rotatedY + centerY + offset.y
          };
        });
      }
      
      const offsetPoints = transformedPoints.map((p) => ({ 
        x: p.x + offsetX, 
        y: p.y + offsetY 
      }));
      
      pathString += pointsToSmoothPathOpen(offsetPoints, seededRandom, curveAmount) + ' ';
    }
  }
  
  return pathString.trim();
}

/**
 * Generates Pencil path for triangle as three separate overlapping sides.
 * Each side rendered with individual jitter and offset for straighter appearance.
 */
function generatePencilTriangleSides(element, strokeWidth, seededRandom, strokeNum, range) {
  const w = element.width || 0;
  const h = element.height || 0;
  const overlap = Math.max(1, (strokeWidth || 4) * 0.3);
  const jitterAmount = Math.max(0.2, (strokeWidth || 4) * 0.08);
  const curveAmount = Math.max(0.3, (strokeWidth || 4) * 0.06);
  
  // Triangle vertexes: top, bottom-right, bottom-left
  const v1 = { x: w / 2, y: 0 };
  const v2 = { x: w, y: h };
  const v3 = { x: 0, y: h };
  
  // Calculate perpendicular directions for each side
  const getSidePerp = (start, end) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: -dy / len, y: dx / len };
  };
  
  const sides = [
    { start: v1, end: v2, perp: getSidePerp(v1, v2) },
    { start: v2, end: v3, perp: getSidePerp(v2, v3) },
    { start: v3, end: v1, perp: getSidePerp(v3, v1) }
  ];
  
  let pathString = '';
  for (let si = 0; si < strokeNum; si++) {
    const rx = seededRandom(si * 13) * range;
    const c = seededRandom(si * 17) * Math.PI * 2;
    const c0 = seededRandom(si * 19) * Math.PI * 2;
    const x0 = rx * Math.sin(c0);
    const y0 = (rx / 2) * Math.cos(c0);
    const offsetX = x0 * Math.cos(c) - y0 * Math.sin(c);
    const offsetY = x0 * Math.sin(c) + y0 * Math.cos(c);
    
    for (let sideIdx = 0; sideIdx < sides.length; sideIdx++) {
      const side = sides[sideIdx];
      const perpX = side.perp.x;
      const perpY = side.perp.y;
      
      // Extend side slightly for overlap at corners
      const dx = side.end.x - side.start.x;
      const dy = side.end.y - side.start.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const dirX = dx / len;
      const dirY = dy / len;
      
      const extended = [
        { x: side.start.x - dirX * overlap, y: side.start.y - dirY * overlap },
        null, null, null,
        { x: side.end.x + dirX * overlap, y: side.end.y + dirY * overlap }
      ];
      
      // Add intermediate points
      for (let k = 1; k <= 3; k++) {
        const t = k / 4;
        extended[k] = {
          x: side.start.x + dx * t,
          y: side.start.y + dy * t
        };
        const jitter = (seededRandom(sideIdx * 100 + k * 31 + si * 7) * 2 - 1) * jitterAmount;
        extended[k].x += perpX * jitter;
        extended[k].y += perpY * jitter;
      }
      
      const offsetPoints = extended.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY }));
      pathString += pointsToSmoothPathOpen(offsetPoints, seededRandom, curveAmount) + ' ';
    }
  }
  return pathString.trim();
}

/**
 * Generates Pencil path for polygon as separate overlapping sides.
 * Each side rendered with individual jitter and offset for straighter appearance.
 */
function generatePencilPolygonSides(element, strokeWidth, seededRandom, strokeNum, range) {
  const w = element.width || 0;
  const h = element.height || 0;
  const overlap = Math.max(1, (strokeWidth || 4) * 0.3);
  const jitterAmount = Math.max(0.2, (strokeWidth || 4) * 0.08);
  const curveAmount = Math.max(0.3, (strokeWidth || 4) * 0.06);
  
  const sides = element.polygonSides || 5;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2;
  
  // Generate polygon vertices
  const vertices = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    vertices.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    });
  }
  
  const getSidePerp = (start, end) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: -dy / len, y: dx / len };
  };
  
  let pathString = '';
  for (let si = 0; si < strokeNum; si++) {
    const rx = seededRandom(si * 13) * range;
    const c = seededRandom(si * 17) * Math.PI * 2;
    const c0 = seededRandom(si * 19) * Math.PI * 2;
    const x0 = rx * Math.sin(c0);
    const y0 = (rx / 2) * Math.cos(c0);
    const offsetX = x0 * Math.cos(c) - y0 * Math.sin(c);
    const offsetY = x0 * Math.sin(c) + y0 * Math.cos(c);
    
    for (let sideIdx = 0; sideIdx < vertices.length; sideIdx++) {
      const start = vertices[sideIdx];
      const end = vertices[(sideIdx + 1) % vertices.length];
      const perp = getSidePerp(start, end);
      const perpX = perp.x;
      const perpY = perp.y;
      
      // Extend side for overlap
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const dirX = dx / len;
      const dirY = dy / len;
      
      const extended = [
        { x: start.x - dirX * overlap, y: start.y - dirY * overlap },
        null, null, null,
        { x: end.x + dirX * overlap, y: end.y + dirY * overlap }
      ];
      
      for (let k = 1; k <= 3; k++) {
        const t = k / 4;
        extended[k] = {
          x: start.x + dx * t,
          y: start.y + dy * t
        };
        const jitter = (seededRandom(sideIdx * 100 + k * 31 + si * 7) * 2 - 1) * jitterAmount;
        extended[k].x += perpX * jitter;
        extended[k].y += perpY * jitter;
      }
      
      const offsetPoints = extended.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY }));
      pathString += pointsToSmoothPathOpen(offsetPoints, seededRandom, curveAmount) + ' ';
    }
  }
  return pathString.trim();
}

/**
 * Generates Paint Brush path for triangle as three separate overlapping sides.
 */
function generatePaintBrushTriangleSides(element, strokeWidth, seededRandom, strokeNum, range) {
  const w = element.width || 0;
  const h = element.height || 0;
  const overlap = Math.max(1, (strokeWidth || 4) * 0.3);
  const jitterAmount = Math.max(0.2, (strokeWidth || 4) * 0.08);
  const curveAmount = Math.max(0.3, (strokeWidth || 4) * 0.06);
  
  const v1 = { x: w / 2, y: 0 };
  const v2 = { x: w, y: h };
  const v3 = { x: 0, y: h };
  
  const getSidePerp = (start, end) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: -dy / len, y: dx / len };
  };
  
  const sides = [
    { start: v1, end: v2, perp: getSidePerp(v1, v2) },
    { start: v2, end: v3, perp: getSidePerp(v2, v3) },
    { start: v3, end: v1, perp: getSidePerp(v3, v1) }
  ];
  
  let pathString = '';
  for (let si = 0; si < strokeNum; si++) {
    const rx = seededRandom(si * 13) * range;
    const c = seededRandom(si * 17) * Math.PI * 2;
    const c0 = seededRandom(si * 19) * Math.PI * 2;
    const x0 = rx * Math.sin(c0);
    const y0 = (rx / 2) * Math.cos(c0);
    const offsetX = x0 * Math.cos(c) - y0 * Math.sin(c);
    const offsetY = x0 * Math.sin(c) + y0 * Math.cos(c);
    
    for (let sideIdx = 0; sideIdx < sides.length; sideIdx++) {
      const side = sides[sideIdx];
      const perpX = side.perp.x;
      const perpY = side.perp.y;
      
      const dx = side.end.x - side.start.x;
      const dy = side.end.y - side.start.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const dirX = dx / len;
      const dirY = dy / len;
      
      const extended = [
        { x: side.start.x - dirX * overlap, y: side.start.y - dirY * overlap },
        null, null, null,
        { x: side.end.x + dirX * overlap, y: side.end.y + dirY * overlap }
      ];
      
      for (let k = 1; k <= 3; k++) {
        const t = k / 4;
        extended[k] = {
          x: side.start.x + dx * t,
          y: side.start.y + dy * t
        };
        const jitter = (seededRandom(sideIdx * 100 + k * 31 + si * 7) * 2 - 1) * jitterAmount;
        extended[k].x += perpX * jitter;
        extended[k].y += perpY * jitter;
      }
      
      const offsetPoints = extended.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY }));
      pathString += pointsToSmoothPathOpen(offsetPoints, seededRandom, curveAmount) + ' ';
    }
  }
  return pathString.trim();
}

/**
 * Generates Paint Brush path for polygon as separate overlapping sides.
 */
function generatePaintBrushPolygonSides(element, strokeWidth, seededRandom, strokeNum, range) {
  const w = element.width || 0;
  const h = element.height || 0;
  const overlap = Math.max(1, (strokeWidth || 4) * 0.3);
  const jitterAmount = Math.max(0.2, (strokeWidth || 4) * 0.08);
  const curveAmount = Math.max(0.3, (strokeWidth || 4) * 0.06);
  
  const sides = element.polygonSides || 5;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2;
  
  const vertices = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    vertices.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    });
  }
  
  const getSidePerp = (start, end) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: -dy / len, y: dx / len };
  };
  
  let pathString = '';
  for (let si = 0; si < strokeNum; si++) {
    const rx = seededRandom(si * 13) * range;
    const c = seededRandom(si * 17) * Math.PI * 2;
    const c0 = seededRandom(si * 19) * Math.PI * 2;
    const x0 = rx * Math.sin(c0);
    const y0 = (rx / 2) * Math.cos(c0);
    const offsetX = x0 * Math.cos(c) - y0 * Math.sin(c);
    const offsetY = x0 * Math.sin(c) + y0 * Math.cos(c);
    
    for (let sideIdx = 0; sideIdx < vertices.length; sideIdx++) {
      const start = vertices[sideIdx];
      const end = vertices[(sideIdx + 1) % vertices.length];
      const perp = getSidePerp(start, end);
      const perpX = perp.x;
      const perpY = perp.y;
      
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const dirX = dx / len;
      const dirY = dy / len;
      
      const extended = [
        { x: start.x - dirX * overlap, y: start.y - dirY * overlap },
        null, null, null,
        { x: end.x + dirX * overlap, y: end.y + dirY * overlap }
      ];
      
      for (let k = 1; k <= 3; k++) {
        const t = k / 4;
        extended[k] = {
          x: start.x + dx * t,
          y: start.y + dy * t
        };
        const jitter = (seededRandom(sideIdx * 100 + k * 31 + si * 7) * 2 - 1) * jitterAmount;
        extended[k].x += perpX * jitter;
        extended[k].y += perpY * jitter;
      }
      
      const offsetPoints = extended.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY }));
      pathString += pointsToSmoothPathOpen(offsetPoints, seededRandom, curveAmount) + ' ';
    }
  }
  return pathString.trim();
}

/**
 * PencilBrush – fabric-brush algorithm (performance-capped)
 * For rect (textbox borders): four separate overlapping sides, low jitter, max 3 direction changes per side.
 * For other shapes: multiple strokes with smooth curves. No splash circles.
 */
function generatePencilPath(element, options = {}) {
  const { document } = options;
  const strokeWidth = (element.type === 'line' || element.type === 'brush')
    ? (element.strokeWidth || 0)
    : (element.borderWidth || element.strokeWidth || 0);
  const baseWidth = 20;
  const sw = strokeWidth || 4;
  const size = Math.max(1, sw / 5 + baseWidth);
  const strokeNum = Math.max(3, Math.min(6, Math.floor(size * 0.5)));
  const range = Math.max(4, sw * 0.6);
  const seed = parseInt(String(element.id || '1').replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
  const seededRandom = (offset) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };
  const cornerRadius = element.cornerRadius || 0;
  
  // For rect without corner radius: use 4-sided rendering
  if (element.type === 'rect' && cornerRadius === 0) {
    return generatePencilRectFourSides(element, strokeWidth, seededRandom, strokeNum, range);
  }
  // For triangle: use 3-sided rendering
  if (element.type === 'triangle') {
    return generatePencilTriangleSides(element, strokeWidth, seededRandom, strokeNum, range);
  }
  // For polygon: use side-by-side rendering
  if (element.type === 'polygon') {
    return generatePencilPolygonSides(element, strokeWidth, seededRandom, strokeNum, range);
  }
  
  const basePath = generateDefaultPath(element, options);
  let pathLength = 0;
  let points = [];
  const stepSize = 10;
  const maxPoints = 50;
  if (document && document.createElementNS) {
    try {
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', basePath);
      if (pathEl.getTotalLength) {
        pathLength = pathEl.getTotalLength();
        const rawStepNum = Math.max(2, Math.floor(pathLength / stepSize));
        const stepNum = Math.min(maxPoints - 1, rawStepNum);
        for (let j = 0; j <= stepNum; j++) {
          const t = (stepNum > 0 ? j / stepNum : 0) * pathLength;
          const pt = pathEl.getPointAtLength(t);
          points.push({ x: pt.x, y: pt.y });
        }
      }
    } catch (_e) { /* fallback */ }
  }
  if (points.length === 0) {
    if (element.type === 'line') {
      const len = Math.sqrt(element.width * element.width + element.height * element.height);
      const stepNum = Math.min(maxPoints - 1, Math.max(2, Math.floor(len / stepSize)));
      for (let j = 0; j <= stepNum; j++) {
        const t = stepNum > 0 ? j / stepNum : 0;
        points.push({ x: element.width * t, y: element.height * t });
      }
    } else {
      return basePath;
    }
  }
  const isClosed = element.type !== 'line' && element.type !== 'brush';
  const jitterAmount = Math.max(0.2, (strokeWidth || 4) * 0.08);
  let pointsProcessed = addPathJitter(points, jitterAmount, seededRandom, isClosed);
  if (isClosed) {
    const outwardAmount = Math.max(1, (strokeWidth || 4) * 0.25);
    pointsProcessed = addOutwardOffset(pointsProcessed, outwardAmount, seededRandom);
  }
  const curveAmount = Math.max(1.5, (strokeWidth || 4) * 0.2);
  let pathString = '';
  for (let si = 0; si < strokeNum; si++) {
    const rx = seededRandom(si * 13) * range;
    const c = seededRandom(si * 17) * Math.PI * 2;
    const c0 = seededRandom(si * 19) * Math.PI * 2;
    const x0 = rx * Math.sin(c0);
    const y0 = (rx / 2) * Math.cos(c0);
    const cos = Math.cos(c);
    const sin = Math.sin(c);
    const offsetX = x0 * cos - y0 * sin;
    const offsetY = x0 * sin + y0 * cos;
    const offsetPoints = pointsProcessed.map((p) => ({
      x: p.x + offsetX,
      y: p.y + offsetY
    }));
    pathString += pointsToSmoothPath(offsetPoints, seededRandom, isClosed, curveAmount) + ' ';
  }
  return pathString.trim() || basePath;
}

/**
 * Generates a freehand path using perfect-freehand library
 * Creates natural-looking hand-drawn strokes with variable width
 * @param {Object} element - Element object
 * @param {Object} options - Options object
 * @returns {string} SVG path string
 */
function generateFreehandPath(element, options = {}) {
  // Try to use perfect-freehand if available (client-side)
  // Server-side fallback: use default path
  
  try {
    // Check if getStroke is available (perfect-freehand on client)
    // For server-side compatibility, we gracefully fall back to default
    const isClientSide = typeof window !== 'undefined' || (typeof require !== 'undefined' && typeof global !== 'undefined');

    if (!isClientSide) {
      // Server-side: fall back to generateDefaultPath
      return generateDefaultPath(element, options);
    }

    // Generate outline points based on element type
    const outlinePoints = generateShapeOutlinePoints(element);
    
    if (outlinePoints.length < 3) {
      return generateDefaultPath(element, options);
    }

    // getStroke is injected by the client wrapper
    const getStroke = options?.getStroke;

    if (!getStroke || typeof getStroke !== 'function') {
      return generateDefaultPath(element, options);
    }

    // Get freehand settings from element
    const size = (element.type === 'line' || element.type === 'brush')
      ? (element.strokeWidth || 2)
      : (element.borderWidth || element.strokeWidth || 2);
    const simplification = element.freehandSimplification ?? 0.5;
    const taperStart = element.freehandTaperStart ?? 0.3;
    const taperEnd = element.freehandTaperEnd ?? 0.3;
    const simulatePressure = element.freehandPressure !== false; // default true
    const seedFallback = parseInt(String(element.id || '1').replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
    const seed = element.freehandSeed ?? seedFallback;
    const normalizedSimplification = Math.max(0, Math.min(1, simplification));
    const normalizedTaperStart = Math.max(0, Math.min(1, taperStart));
    const normalizedTaperEnd = Math.max(0, Math.min(1, taperEnd));

    const seededRandom = (index) => {
      const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
      return value - Math.floor(value);
    };

    const pointCount = outlinePoints.length;
    const pointOffset = pointCount > 0 ? Math.floor(seededRandom(999) * pointCount) : 0;
    const jitterAmplitude = Math.max(0, (1 - normalizedSimplification) * size * 0.45);

    const strokeInputPoints = outlinePoints.map((_, index) => {
      const sourcePoint = outlinePoints[(index + pointOffset) % pointCount] || outlinePoints[index];
      const progress = pointCount > 1 ? (index / (pointCount - 1)) : 0;
      const startInfluence = (1 - progress) * normalizedTaperStart;
      const endInfluence = progress * normalizedTaperEnd;
      const pressure = Math.max(0.05, Math.min(1, 1 - (startInfluence + endInfluence) * 0.6));
      const jitterAngle = seededRandom(index * 3) * Math.PI * 2;
      const jitterRadius = ((seededRandom(index * 3 + 1) * 2) - 1) * jitterAmplitude;
      const jitterX = Math.cos(jitterAngle) * jitterRadius;
      const jitterY = Math.sin(jitterAngle) * jitterRadius;

      return [sourcePoint[0] + jitterX, sourcePoint[1] + jitterY, pressure];
    });

    // For rect/text without corner radius, render as four open subpaths
    // Reuse the same open-side geometry as Pencil/Paint Brush for stronger visible freehand effects
    const useOpenRectSides = (element.type === 'rect' || element.type === 'text') && (element.cornerRadius || 0) === 0;
    if (useOpenRectSides) {
      const sides = getRectOpenSides(element, size);
      const sideJitterAmount = Math.max(0.15, (1 - normalizedSimplification) * size * 0.18);
      const subPathStrings = [];

      for (let sideIdx = 0; sideIdx < sides.length; sideIdx++) {
        const sideBasePoints = buildOpenSidePoints(sides[sideIdx], sideIdx, seededRandom, 0, sideJitterAmount);
        const sideInputPoints = sideBasePoints.map((point, idx) => {
          const progress = idx / Math.max(1, sideBasePoints.length - 1);
          const startInfluence = (1 - progress) * normalizedTaperStart;
          const endInfluence = progress * normalizedTaperEnd;
          const pressure = Math.max(0.05, Math.min(1, 1 - (startInfluence + endInfluence) * 0.65));
          return [point.x, point.y, pressure];
        });

        const sideStroke = getStroke(sideInputPoints, {
          size: Math.max(1, size),
          thinning: simulatePressure ? (0.2 + ((normalizedTaperStart + normalizedTaperEnd) / 2) * 0.8) : 0,
          smoothing: 0.2 + normalizedSimplification * 0.75,
          streamline: 0.15 + normalizedSimplification * 0.75,
          easing: (t) => t,
          simulatePressure: simulatePressure,
          start: {
            taper: Math.max(0, size * (0.2 + normalizedTaperStart * 1.8)),
            cap: true
          },
          end: {
            taper: Math.max(0, size * (0.2 + normalizedTaperEnd * 1.8)),
            cap: true
          },
          seed: seed + sideIdx * 997
        });

        if (sideStroke && sideStroke.length >= 2) {
          let sidePath = `M ${sideStroke[0][0]} ${sideStroke[0][1]}`;
          for (let pointIdx = 1; pointIdx < sideStroke.length; pointIdx++) {
            sidePath += ` L ${sideStroke[pointIdx][0]} ${sideStroke[pointIdx][1]}`;
          }
          sidePath += ' Z';
          subPathStrings.push(sidePath);
        }
      }

      if (subPathStrings.length > 0) {
        const openPathResult = subPathStrings.join(' ');
        return openPathResult;
      }
    }

    // Generate stroke outline (hand-drawn outline)
    const outlineStrpts = getStroke(strokeInputPoints, {
      size: Math.max(1, size),
      thinning: simulatePressure ? (0.15 + ((normalizedTaperStart + normalizedTaperEnd) / 2) * 0.85) : 0,
      smoothing: 0.2 + normalizedSimplification * 0.75,
      streamline: 0.15 + normalizedSimplification * 0.75,
      easing: (t) => t,
      simulatePressure: simulatePressure,
      start: {
        taper: Math.max(0, size * (0.2 + normalizedTaperStart * 1.8)),
        cap: true
      },
      end: {
        taper: Math.max(0, size * (0.2 + normalizedTaperEnd * 1.8)),
        cap: true
      },
      seed: seed
    });

    if (!outlineStrpts || outlineStrpts.length < 2) {
      return generateDefaultPath(element, options);
    }

    // Convert stroke outline to SVG path
    let pathString = `M ${outlineStrpts[0][0]} ${outlineStrpts[0][1]}`;
    for (let i = 1; i < outlineStrpts.length; i++) {
      pathString += ` L ${outlineStrpts[i][0]} ${outlineStrpts[i][1]}`;
    }
    pathString += ' Z'; // Close the path

    return pathString;
  } catch (error) {
    // Graceful fallback: use default path
    return generateDefaultPath(element, options);
  }
}

/**
 * Helper: Generate center-line points for a border
 * Creates points along the CENTER of where the border should be
 * These are thin outline points that getStroke() will thicken appropriately
 * @param {Object} element - Element with type, width, height, borderWidth
 * @returns {Array<[number, number]>} Array of [x, y] points along the border center line
 */
function generateShapeOutlinePoints(element) {
  console.log('🎨 [generateShapeOutlinePoints] Called for element type:', element.type);
  
  const w = element.width || 0;
  const h = element.height || 0;
  
  // Determine border width
  const borderWidth = (element.type === 'line' || element.type === 'brush')
    ? (element.strokeWidth || 2)
    : (element.borderWidth || element.strokeWidth || 2);
  
  // For a hand-drawn border, generate points along the CENTER line of the border
  // getStroke() will create an outline around these points with appropriate thickness
  // This avoids the problem of creating a closed polygon that fills the entire interior
  const centerOffset = borderWidth / 2;
  
  console.log('🎨 [generateShapeOutlinePoints] borderWidth:', borderWidth, 'centerOffset:', centerOffset);
  
  const points = [];
  const resolution = 20; // Number of points per side

  if (element.type === 'rect' || element.type === 'text') {
    const r = element.cornerRadius || 0;
    
    if (r === 0) {
      // Simple rectangle border: center line points
      // TOP edge (center line y = centerOffset)
      for (let i = 0; i < resolution; i++) {
        const t = i / resolution;
        points.push([centerOffset + (w - 2 * centerOffset) * t, centerOffset]);
      }
      // RIGHT edge (center line x = w - centerOffset)
      for (let i = 0; i < resolution; i++) {
        const t = i / resolution;
        points.push([w - centerOffset, centerOffset + (h - 2 * centerOffset) * t]);
      }
      // BOTTOM edge (right to left, center line y = h - centerOffset)
      for (let i = 0; i < resolution; i++) {
        const t = i / resolution;
        points.push([w - centerOffset - (w - 2 * centerOffset) * t, h - centerOffset]);
      }
      // LEFT edge (bottom to top, center line x = centerOffset)
      for (let i = 0; i < resolution; i++) {
        const t = i / resolution;
        points.push([centerOffset, h - centerOffset - (h - 2 * centerOffset) * t]);
      }
    } else {
      // Rounded rectangle border: center line
      const cornerR = Math.min(Math.max(r - centerOffset, 0), (w - 2 * centerOffset) / 2, (h - 2 * centerOffset) / 2);
      const innerW = w - 2 * centerOffset;
      const innerH = h - 2 * centerOffset;
      
      // Trace around the center line of the rounded rect
      const numPoints = Math.max(20, Math.floor((innerW + innerH) * 2 / 10));
      
      // Top edge (center line)
      for (let i = 0; i < numPoints / 4; i++) {
        const t = i / (numPoints / 4);
        const x = centerOffset + cornerR + (innerW - 2 * cornerR) * t;
        points.push([x, centerOffset]);
      }
      
      // Top-right corner (center points)
      for (let i = 0; i < numPoints / 4; i++) {
        const t = i / (numPoints / 4);
        const angle = -Math.PI / 2 + (Math.PI / 2) * t;
        const x = w - centerOffset - cornerR + cornerR * Math.cos(angle);
        const y = centerOffset + cornerR + cornerR * Math.sin(angle);
        points.push([x, y]);
      }
      
      // Right edge (center line)
      for (let i = 0; i < numPoints / 4; i++) {
        const t = i / (numPoints / 4);
        const y = centerOffset + cornerR + (innerH - 2 * cornerR) * t;
        points.push([w - centerOffset, y]);
      }
      
      // Bottom-right corner (center points)
      for (let i = 0; i < numPoints / 4; i++) {
        const t = i / (numPoints / 4);
        const angle = 0 + (Math.PI / 2) * t;
        const x = w - centerOffset - cornerR + cornerR * Math.cos(angle);
        const y = h - centerOffset - cornerR + cornerR * Math.sin(angle);
        points.push([x, y]);
      }
      
      // Bottom edge (center line)
      for (let i = 0; i < numPoints / 4; i++) {
        const t = i / (numPoints / 4);
        const x = w - centerOffset - cornerR - (innerW - 2 * cornerR) * t;
        points.push([x, h - centerOffset]);
      }
      
      // Bottom-left corner (center points)
      for (let i = 0; i < numPoints / 4; i++) {
        const t = i / (numPoints / 4);
        const angle = Math.PI / 2 + (Math.PI / 2) * t;
        const x = centerOffset + cornerR + cornerR * Math.cos(angle);
        const y = h - centerOffset - cornerR + cornerR * Math.sin(angle);
        points.push([x, y]);
      }
      
      // Left edge (center line)
      for (let i = 0; i < numPoints / 4; i++) {
        const t = i / (numPoints / 4);
        const y = h - centerOffset - cornerR - (innerH - 2 * cornerR) * t;
        points.push([centerOffset, y]);
      }
      
      // Top-left corner (center points)
      for (let i = 0; i < numPoints / 4; i++) {
        const t = i / (numPoints / 4);
        const angle = Math.PI + (Math.PI / 2) * t;
        const x = centerOffset + cornerR + cornerR * Math.cos(angle);
        const y = centerOffset + cornerR + cornerR * Math.sin(angle);
        points.push([x, y]);
      }
    }
  } else if (element.type === 'circle') {
    // Circle border: generate points along the center line of the border
    const r = Math.min(w, h) / 2 - centerOffset;
    const cx = w / 2, cy = h / 2;
    const numPoints = resolution * 4;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
  } else if (element.type === 'line') {
    // For lines: generate center line points along the line path
    // getStroke will thicken these appropriately
    points.push([0, 0]);
    points.push([element.width, element.height]);
  } else {
    // Default: simple rectangle border center line for other shapes
    points.push([centerOffset, centerOffset]);
    points.push([w - centerOffset, centerOffset]);
    points.push([w - centerOffset, h - centerOffset]);
    points.push([centerOffset, h - centerOffset]);
  }

  console.log('🎨 [generateShapeOutlinePoints] Generated', points.length, 'border center-line points');
  
  return points.length >= 2 ? points : [[centerOffset, centerOffset], [w - centerOffset, h - centerOffset]];
}

/**
 * PaintBrush – same structure as Ink (before width/dash changes).
 * Four separate sides for rect, smooth curves, no strokeDasharray/dashes.
 */
function generatePaintBrushPath(element, options = {}) {
  const { document } = options;
  const strokeWidth = (element.type === 'line' || element.type === 'brush')
    ? (element.strokeWidth || 0)
    : (element.borderWidth || element.strokeWidth || 0);
  const sw = strokeWidth || 4;
  const paintBrushStrokeWidth = Math.max(1, sw * 0.35);
  const referenceWidth = 6.5;
  const referenceStrokeWidth = Math.max(1, referenceWidth * 0.35);
  const referenceRange = Math.max(1, referenceWidth / 5 + 20) / 2;
  const spacingFactor = referenceRange / referenceStrokeWidth;
  const strokeNum = 8;
  const range = Math.max(3, paintBrushStrokeWidth * spacingFactor * 0.7);
  const seed = parseInt(String(element.id || '1').replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
  const seededRandom = (offset) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };
  const cornerRadius = element.cornerRadius || 0;
  if (element.type === 'rect' && cornerRadius === 0) {
    return generatePaintBrushRectFourSides(element, strokeWidth, seededRandom, strokeNum, range);
  }
  // For triangle: use 3-sided rendering
  if (element.type === 'triangle') {
    return generatePaintBrushTriangleSides(element, strokeWidth, seededRandom, strokeNum, range);
  }
  // For polygon: use side-by-side rendering
  if (element.type === 'polygon') {
    return generatePaintBrushPolygonSides(element, strokeWidth, seededRandom, strokeNum, range);
  }
  const basePath = generateDefaultPath(element, options);
  let pathLength = 0;
  let points = [];
  const stepSize = 10;
  const maxPoints = 50;
  if (document && document.createElementNS) {
    try {
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', basePath);
      if (pathEl.getTotalLength) {
        pathLength = pathEl.getTotalLength();
        const rawStepNum = Math.max(2, Math.floor(pathLength / stepSize));
        const stepNum = Math.min(maxPoints - 1, rawStepNum);
        for (let j = 0; j <= stepNum; j++) {
          const t = (stepNum > 0 ? j / stepNum : 0) * pathLength;
          const pt = pathEl.getPointAtLength(t);
          points.push({ x: pt.x, y: pt.y });
        }
      }
    } catch (_e) { /* fallback */ }
  }
  if (points.length === 0) {
    if (element.type === 'line') {
      const len = Math.sqrt(element.width * element.width + element.height * element.height);
      const stepNum = Math.min(maxPoints - 1, Math.max(2, Math.floor(len / stepSize)));
      for (let j = 0; j <= stepNum; j++) {
        const t = stepNum > 0 ? j / stepNum : 0;
        points.push({ x: element.width * t, y: element.height * t });
      }
    } else {
      return basePath;
    }
  }
  const isClosed = element.type !== 'line' && element.type !== 'brush';
  const jitterAmount = Math.max(0.2, (strokeWidth || 4) * 0.08);
  let pointsProcessed = addPathJitter(points, jitterAmount, seededRandom, isClosed);
  if (isClosed) {
    const outwardAmount = Math.max(1, (strokeWidth || 4) * 0.25);
    pointsProcessed = addOutwardOffset(pointsProcessed, outwardAmount, seededRandom);
  }
  const curveAmount = Math.max(2, (strokeWidth || 4) * 0.3);
  let pathString = '';
  for (let si = 0; si < strokeNum; si++) {
    const rx = seededRandom(si * 13) * range;
    const c = seededRandom(si * 17) * Math.PI * 2;
    const c0 = seededRandom(si * 19) * Math.PI * 2;
    const x0 = rx * Math.sin(c0);
    const y0 = (rx / 2) * Math.cos(c0);
    const cos = Math.cos(c);
    const sin = Math.sin(c);
    const offsetX = x0 * cos - y0 * sin;
    const offsetY = x0 * sin + y0 * cos;
    const offsetPoints = pointsProcessed.map((p) => ({
      x: p.x + offsetX,
      y: p.y + offsetY
    }));
    pathString += pointsToSmoothPath(offsetPoints, seededRandom, isClosed, curveAmount) + ' ';
  }
  return pathString.trim() || basePath;
}

/**
 * Generates a dashed path for all element types
 * Uses simple paths with dash pattern applied via strokeDasharray
 * @param {Object} element - Element object
 * @param {Object} options - Options object
 * @returns {string} SVG path string
 */
function generateDashedPath(element, options = {}) {
  // Für alle Elementtypen: Einfache Pfade, gestrichelte Darstellung über strokeDasharray
  if (element.type === 'line') {
    return `M 0 0 L ${element.width} ${element.height}`;
  } else if (element.type === 'rect') {
    if (element.cornerRadius && element.cornerRadius > 0) {
      const r = Math.min(element.cornerRadius, element.width / 2, element.height / 2);
      return `M ${r} 0 L ${element.width - r} 0 Q ${element.width} 0 ${element.width} ${r} L ${element.width} ${element.height - r} Q ${element.width} ${element.height} ${element.width - r} ${element.height} L ${r} ${element.height} Q 0 ${element.height} 0 ${element.height - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
    }
    return `M 0 0 L ${element.width} 0 L ${element.width} ${element.height} L 0 ${element.height} Z`;
  } else if (element.type === 'circle') {
    const r = Math.min(element.width, element.height) / 2;
    const cx = element.width / 2, cy = element.height / 2;
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`;
  } else if (element.type === 'brush' && element.points) {
    let pathString = `M ${element.points[0]} ${element.points[1]}`;
    for (let i = 2; i < element.points.length; i += 2) {
      pathString += ` L ${element.points[i]} ${element.points[i + 1]}`;
    }
    return pathString;
  }
  // Fallback
  return generateDefaultPath(element, options);
}

function getStrokeProps(element, style, options = {}) {
  
  // For shapes (not line/brush), use borderWidth; for line/brush, use strokeWidth
  let strokeWidth = (element.type === 'line' || element.type === 'brush')
    ? (element.strokeWidth || 0)
    : (element.borderWidth || element.strokeWidth || 0);

  // Simple logic: if strokeWidth is in common scale (1-100), convert it
  // If it's outside this range, assume it's already converted
  if (strokeWidth >= 1 && strokeWidth <= 100) {
    strokeWidth = commonToActualStrokeWidth(strokeWidth, style);
  }
  // Otherwise keep as-is (already converted or 0)

  // Style-specific stroke props
  // Glow: Multi-Stroke-Layers statt shadowBlur (performanter – kein teurer Blur-Filter)
  if (style === 'glow') {
    const fill = element.type === 'line' || element.type === 'brush'
      ? (element.stroke || '#1f2937')
      : (element.fill !== 'transparent' ? element.fill : undefined);

    return {
      stroke: element.stroke || '#1f2937',
      strokeWidth: strokeWidth * 2,
      fill: fill,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
      // Performante Glow-Alternative: überlagerte Striche statt shadowBlur
      useGlowLayers: true,
      glowLayerWidthMultiplier: 2.5,
      glowLayerOpacity: 0.25
    };
  } else if (style === 'candy') {
    // Check if candyHoled is enabled - if so, use transparent fill
    const fill = element.candyHoled ? 'transparent' : (element.stroke || '#ff0000');

    if (element.type === 'brush') {
      return {
        stroke: 'transparent',
        strokeWidth: 0,
        fill: fill
      };
    }

    // Für Linien: Gestrichlete Darstellung statt Kreise (performanter)
    if (element.type === 'line') {
      const dashLength = Math.max(4, strokeWidth * 2);
      const gapLength = Math.max(3, strokeWidth * 1.5);
      const dotSize = 0.001; // Sehr kleiner Punkt für besseres Aussehen
      const dashPattern = [dashLength, gapLength, dotSize, gapLength];
      return {
        stroke: strokeWidth > 0 ? element.stroke || '#ff0000' : 'transparent',
        strokeWidth: strokeWidth,
        fill: 'transparent',
        strokeDasharray: dashPattern, // Für native Konva
        dash: dashPattern, // Für React-Konva
        lineCap: 'round'
      };
    }

    // Für andere Elemente (rect, circle): Normale Kreise behalten
    return {
      stroke: strokeWidth > 0 ? element.stroke || '#ff0000' : 'transparent',
      strokeWidth: strokeWidth,
      fill: strokeWidth > 0 ? 'transparent' : fill
    };
  } else if (style === 'dashed') {
    // EXAKT wie Candy für line: Gestrichlete Darstellung für alle Elementtypen
    // 1:1 Kopie der Candy-Logik für line, angewendet auf alle Typen
    const dashLength = Math.max(4, strokeWidth * 2);
    const gapLength = Math.max(3, strokeWidth * 1.5);
    const dotSize = 0.001; // Sehr kleiner Punkt für besseres Aussehen
    const dashPattern = [dashLength, gapLength, dotSize, gapLength];
    
    if (element.type === 'brush') {
      return {
        stroke: 'transparent',
        strokeWidth: 0,
        fill: element.stroke || '#1f2937'
      };
    }
    
    // EXAKT wie Candy für line - für alle Typen (line, rect, circle)
    return {
      stroke: strokeWidth > 0 ? element.stroke || '#1f2937' : 'transparent',
      strokeWidth: strokeWidth,
      fill: 'transparent',
      strokeDasharray: dashPattern, // Für native Konva
      dash: dashPattern, // Für React-Konva
      lineCap: 'round'
    };
  } else if (style === 'wobbly') {
    if (element.type === 'brush' || element.type === 'line') {
      return {
        stroke: 'transparent',
        strokeWidth: 0,
        fill: element.stroke || '#1f2937'
      };
    }

    return {
      stroke: strokeWidth > 0 ? element.stroke || '#1f2937' : 'transparent',
      strokeWidth: strokeWidth,
      fill: strokeWidth > 0 ? 'transparent' : (element.stroke || '#1f2937')
    };
  } else if (style === 'zigzag') {
    // For shapes, use element.fill (background) if available; for line/brush, use stroke as fill
    const fill = element.type === 'line' || element.type === 'brush'
      ? (element.stroke || '#bf4d28')
      : (element.fill !== 'transparent' ? element.fill : 'transparent');

    return {
      stroke: element.stroke || '#bf4d28',
      strokeWidth: strokeWidth,
      fill: fill,
      lineCap: 'round',
      lineJoin: 'round'
    };
  } else if (style === 'marker') {
    return {
      stroke: element.stroke || '#1f2937',
      strokeWidth: 3,
      fill: 'transparent',
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round'
    };
  } else if (style === 'crayon') {
    return {
      stroke: element.stroke || '#1f2937',
      strokeWidth: strokeWidth,
      fill: 'transparent',
      lineCap: 'round',
      lineJoin: 'round'
    };
  } else if (style === 'paint-brush') {
    const paintBrushStrokeWidth = Math.max(1, (strokeWidth || 4) * 0.35);
    return {
      stroke: element.stroke || '#1f2937',
      strokeWidth: paintBrushStrokeWidth,
      fill: 'transparent',
      lineCap: 'round',
      lineJoin: 'round'
    };
  } else if (style === 'pencil') {
    const sw = strokeWidth || 4;
    const pencilStrokeWidth = Math.max(0.1, sw * 0.04);
    const seed = parseInt(String(element.id || '1').replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
    const seededRandom = (offset) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };
    const dashPattern = [];
    const gapBase = Math.max(0.6, sw * 0.03);
    const gapRange = Math.max(3.2, sw * 0.16);
    for (let i = 0; i < 4; i++) {
      dashPattern.push(
        10 + seededRandom(i * 7) * 55,
        gapBase + seededRandom(i * 11 + 100) * gapRange
      );
    }
    return {
      stroke: element.stroke || '#1f2937',
      strokeWidth: pencilStrokeWidth,
      fill: 'transparent',
      lineCap: 'round',
      lineJoin: 'round'
    };
  } else if (style === 'freehand') {
    // Freehand: perfect-freehand returns an outline polygon path
    // Render it as fill to display the generated hand-drawn stroke shape
    return {
      stroke: 'transparent',
      strokeWidth: 0,
      fill: element.stroke || '#1f2937',
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round'
    };
  } else {
    // Default and rough styles
    return {
      stroke: element.stroke || '#1f2937',
      strokeWidth: strokeWidth,
      fill: element.type === 'line' ? undefined : (element.fill !== 'transparent' ? element.fill : undefined)
    };
  }
}

/**
 * Generate path for an element based on style
 * @param {Object} element - Element object
 * @param {string} style - Style name
 * @param {Object} options - Options object with { roughInstance?, document?, zoom? }
 * @returns {string} SVG path string
 */
function generatePath(element, style, options = {}) {
  
  switch (style) {
    case 'default':
      return generateDefaultPath(element, options);
    case 'rough':
      return generateRoughPath(element, options);
    case 'glow':
      return generateGlowPath(element, options);
    case 'candy':
      return generateCandyPath(element, options);
    case 'wobbly':
      return generateWobblyPath(element, options);
    case 'zigzag':
      return generateZigzagPath(element, options);
    case 'dashed':
      return generateDashedPath(element, options);
    case 'marker':
      return generateMarkerPath(element, options);
    case 'crayon':
      return generateCrayonPath(element, options);
    case 'pencil':
      return generatePencilPath(element, options);
    case 'paint-brush':
      return generatePaintBrushPath(element, options);
    case 'freehand':
      return generateFreehandPath(element, options);
    default:
      return generateDefaultPath(element, options);
  }
}

// ES module exports for client (Vite / browser)
export {
  generateDefaultPath,
  generateRoughPath,
  generateGlowPath,
  generateCandyPath,
  generateWobblyPath,
  generateZigzagPath,
  generateDashedPath,
  generateMarkerPath,
  generateCrayonPath,
  generatePencilPath,
  generatePaintBrushPath,
  generateFreehandPath,
  generatePath,
  getStrokeProps,
  generateComplexShapePath,
  generateShapeOutlinePoints
};

// CommonJS exports for Node (server)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateDefaultPath,
    generateRoughPath,
    generateGlowPath,
    generateCandyPath,
    generateWobblyPath,
    generateZigzagPath,
    generateDashedPath,
    generateMarkerPath,
    generateCrayonPath,
    generatePencilPath,
    generatePaintBrushPath,
    generateFreehandPath,
    generatePath,
    getStrokeProps,
    generateComplexShapePath,
    generateShapeOutlinePoints
  };
}

