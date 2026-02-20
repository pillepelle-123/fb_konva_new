/**
 * Shared Theme Engine - Pure JavaScript Theme-Algorithmen
 * Zuerst nur Zigzag-Theme als PoC, dann Erweiterung auf alle Themes
 *
 * Alle externen Abhängigkeiten (document, roughInstance) werden über Options injiziert
 */

// Stroke width conversion – works in both browser (ESM) and Node (CJS)
let commonToActualStrokeWidth = (width, _theme) => width;
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
        console.warn('[themes-engine] Failed to calculate path length, using perimeter:', error);
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
    console.warn('[themes-engine] Rough.js not available, falling back to default theme');
    return generateDefaultPath(element, options);
  }
  
  const roughness = element.roughness || 1;
  // For shapes (not line/brush), use borderWidth; for line/brush, use strokeWidth
  const strokeWidth = (element.type === 'line' || element.type === 'brush')
    ? (element.strokeWidth ? element.strokeWidth * zoom : 0)
    : ((element.borderWidth || element.strokeWidth) ? (element.borderWidth || element.strokeWidth) * zoom : 0);
  const stroke = element.stroke || '#1f2937';
  const fill = element.fill || 'transparent';
  const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
  
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
    console.error('[themes-engine] Error generating rough path:', error);
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
 * Gets stroke properties for an element based on theme
 * @param {Object} element - Element object
 * @param {string} theme - Theme name
 * @param {Object} options - Options object
 * @returns {Object} Stroke properties object
 */
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

function getStrokeProps(element, theme, options = {}) {
  // For shapes (not line/brush), use borderWidth; for line/brush, use strokeWidth
  let strokeWidth = (element.type === 'line' || element.type === 'brush')
    ? (element.strokeWidth || 0)
    : (element.borderWidth || element.strokeWidth || 0);

  // Simple logic: if strokeWidth is in common scale (1-100), convert it
  // If it's outside this range, assume it's already converted
  if (strokeWidth >= 1 && strokeWidth <= 100) {
    strokeWidth = commonToActualStrokeWidth(strokeWidth, theme);
  }
  // Otherwise keep as-is (already converted or 0)

  // Theme-specific stroke props
  // Glow: Multi-Stroke-Layers statt shadowBlur (performanter – kein teurer Blur-Filter)
  if (theme === 'glow') {
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
  } else if (theme === 'candy') {
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
  } else if (theme === 'dashed') {
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
  } else if (theme === 'wobbly') {
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
  } else if (theme === 'zigzag') {
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
  } else {
    // Default and rough themes
    return {
      stroke: element.stroke || '#1f2937',
      strokeWidth: strokeWidth,
      fill: element.type === 'line' ? undefined : (element.fill !== 'transparent' ? element.fill : undefined)
    };
  }
}

/**
 * Generate path for an element based on theme
 * @param {Object} element - Element object
 * @param {string} theme - Theme name
 * @param {Object} options - Options object with { roughInstance?, document?, zoom? }
 * @returns {string} SVG path string
 */
function generatePath(element, theme, options = {}) {
  switch (theme) {
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
  generatePath,
  getStrokeProps,
  generateComplexShapePath
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
    generatePath,
    getStrokeProps,
    generateComplexShapePath
  };
}

