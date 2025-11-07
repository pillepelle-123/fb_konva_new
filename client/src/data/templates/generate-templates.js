const fs = require('fs');

// Constants
const A4_WIDTH = 2480;
const A4_HEIGHT = 3508;
const MARGIN = 120;
const GAP = 60;
const MM_TO_PX = 11.811;

const TEXTBOX_HEIGHTS = {
  1: 80, 2: 115, 3: 150, 4: 185, 5: 220, 6: 255, 7: 290, 8: 325
};

function calculateImageSize(widthCm, ratio) {
  const widthPx = widthCm * 10 * MM_TO_PX;
  const heightPx = (widthPx / ratio[0]) * ratio[1];
  return { width: Math.round(widthPx), height: Math.round(heightPx) };
}

function getImagePosition(pos, imgWidth, imgHeight) {
  switch(pos) {
    case 'tl': return { x: MARGIN, y: MARGIN };
    case 'tr': return { x: A4_WIDTH - MARGIN - imgWidth, y: MARGIN };
    case 'bl': return { x: MARGIN, y: A4_HEIGHT - MARGIN - imgHeight };
    case 'br': return { x: A4_WIDTH - MARGIN - imgWidth, y: A4_HEIGHT - MARGIN - imgHeight };
    case 'ml': return { x: MARGIN, y: (A4_HEIGHT - imgHeight) / 2 };
    case 'mr': return { x: A4_WIDTH - MARGIN - imgWidth, y: (A4_HEIGHT - imgHeight) / 2 };
    default: return { x: MARGIN, y: MARGIN };
  }
}

function createTextbox(x, y, width, height, category, index, total) {
  const baseSize = 12;
  let fontSize = baseSize;
  
  if ((category === 'playful' || category === 'creative') && index % 3 === 0) {
    fontSize = baseSize + (index % 5) - 2;
  }
  
  const fontFamily = category === 'playful' ? 'Comic Sans MS, cursive' : 
                     category === 'minimal' ? 'Helvetica, Arial, sans-serif' :
                     'Century Gothic, sans-serif';
  
  return {
    type: "qna_inline",
    position: { x: Math.round(x), y: Math.round(y) },
    size: { width: Math.round(width), height: Math.round(height) },
    questionSettings: {
      fontSize: 18,
      fontFamily,
      fontColor: "#1A1A1A",
      fontBold: false,
      fontItalic: false,
      fontOpacity: 1
    },
    answerSettings: {
      fontSize: 18,
      fontFamily,
      fontColor: "#1A1A1A",
      fontBold: false,
      fontItalic: false,
      fontOpacity: 1
    },
    layoutVariant: "inline",
    style: {
      font: {
        fontSize,
        fontFamily,
        fontColor: "#1A1A1A",
        fontBold: false,
        fontItalic: false,
        fontOpacity: 1
      },
      border: {
        enabled: category === 'sketchy' || category === 'playful',
        borderWidth: category === 'sketchy' ? 5 : 0,
        borderColor: "#424242",
        borderOpacity: 1,
        borderTheme: category === 'sketchy' ? 'sketchy' : 'default'
      },
      background: {
        enabled: category === 'sketchy',
        backgroundColor: "#BDBDBD",
        backgroundOpacity: 0.3
      },
      format: {
        textAlign: "left",
        paragraphSpacing: "medium",
        padding: 15
      },
      cornerRadius: category === 'minimal' ? 0 : 30
    }
  };
}

// Template configurations
const templates = [
  // Structured templates (12 total)
  { id: "qna-1col-2-2-3-4-3-img-1-bl-1:1-5", heights: [2,2,3,4,3], cols: 1, images: [{pos:'bl',ratio:[1,1],width:5}], cat: 'structured' },
  { id: "qna-1col-1-3-2-4-2-3-img-1-br-4:3-4,5", heights: [1,3,2,4,2,3], cols: 1, images: [{pos:'br',ratio:[4,3],width:4.5}], cat: 'structured' },
  { id: "qna-2col-1-2-1-3-2-3-img-0", heights: [1,2,1,3,2,3], cols: 2, images: [], cat: 'structured' },
  { id: "qna-1col-2-3-4-2-3-img-1-tl-3:4-3,5", heights: [2,3,4,2,3], cols: 1, images: [{pos:'tl',ratio:[3,4],width:3.5}], cat: 'structured' },
  { id: "qna-1col-1-1-2-3-4-3-img-0", heights: [1,1,2,3,4,3], cols: 1, images: [], cat: 'structured' },
  { id: "qna-1col-2-2-3-3-4-img-1-tr-1:1-5", heights: [2,2,3,3,4], cols: 1, images: [{pos:'tr',ratio:[1,1],width:5}], cat: 'structured' },
  { id: "qna-1col-1-2-2-3-4-2-img-1-bl-3:4-4,6", heights: [1,2,2,3,4,2], cols: 1, images: [{pos:'bl',ratio:[3,4],width:4.6}], cat: 'structured' },
  { id: "qna-2col-2-2-3-3-4-img-0", heights: [2,2,3,3,4], cols: 2, images: [], cat: 'structured' },
  { id: "qna-1col-1-3-3-4-3-img-1-mr-4:3-6", heights: [1,3,3,4,3], cols: 1, images: [{pos:'mr',ratio:[4,3],width:6}], cat: 'structured' },
  { id: "qna-1col-2-3-4-3-2-img-1-tl-1:1-5", heights: [2,3,4,3,2], cols: 1, images: [{pos:'tl',ratio:[1,1],width:5}], cat: 'structured' },
  { id: "qna-1col-1-1-2-2-3-4-img-0", heights: [1,1,2,2,3,4], cols: 1, images: [], cat: 'structured' },
  { id: "qna-1col-2-4-3-3-2-img-1-tr-3:4-3,5", heights: [2,4,3,3,2], cols: 1, images: [{pos:'tr',ratio:[3,4],width:3.5}], cat: 'structured' },
  
  // Playful templates (8 total)
  { id: "qna-1col-1-2-1-2-3-img-1-tl-1:1-5", heights: [1,2,1,2,3], cols: 1, images: [{pos:'tl',ratio:[1,1],width:5}], cat: 'playful' },
  { id: "qna-1col-2-3-2-3-4-img-1-tr-3:4-3,5", heights: [2,3,2,3,4], cols: 1, images: [{pos:'tr',ratio:[3,4],width:3.5}], cat: 'playful' },
  { id: "qna-2col-1-2-2-3-2-img-0", heights: [1,2,2,3,2], cols: 2, images: [], cat: 'playful' },
  { id: "qna-1col-1-1-2-3-2-3-img-1-bl-1:1-5", heights: [1,1,2,3,2,3], cols: 1, images: [{pos:'bl',ratio:[1,1],width:5}], cat: 'playful' },
  { id: "qna-1col-2-2-3-3-2-img-1-br-4:3-4,5", heights: [2,2,3,3,2], cols: 1, images: [{pos:'br',ratio:[4,3],width:4.5}], cat: 'playful' },
  { id: "qna-1col-1-3-2-3-4-img-1-tl-3:4-3,5", heights: [1,3,2,3,4], cols: 1, images: [{pos:'tl',ratio:[3,4],width:3.5}], cat: 'playful' },
  { id: "qna-1col-2-2-3-4-2-img-1-tr-1:1-5", heights: [2,2,3,4,2], cols: 1, images: [{pos:'tr',ratio:[1,1],width:5}], cat: 'playful' },
  { id: "qna-1col-1-2-3-2-3-3-img-0", heights: [1,2,3,2,3,3], cols: 1, images: [], cat: 'playful' },
  
  // Creative templates (6 total)
  { id: "qna-1col-1-2-3-4-3-img-1-ml-4:3-6", heights: [1,2,3,4,3], cols: 1, images: [{pos:'ml',ratio:[4,3],width:6}], cat: 'creative' },
  { id: "qna-1col-2-3-4-2-3-img-1-tl-2:3-9", heights: [2,3,4,2,3], cols: 1, images: [{pos:'tl',ratio:[2,3],width:9}], cat: 'creative' },
  { id: "qna-1col-1-3-2-4-3-img-1-tr-3:2-13", heights: [1,3,2,4,3], cols: 1, images: [{pos:'tr',ratio:[3,2],width:13}], cat: 'creative' },
  { id: "qna-2col-2-3-3-4-img-1-mr-1:1-7", heights: [2,3,3,4], cols: 2, images: [{pos:'mr',ratio:[1,1],width:7}], cat: 'creative' },
  { id: "qna-1col-2-2-3-4-2-img-1-bl-16:9-10", heights: [2,2,3,4,2], cols: 1, images: [{pos:'bl',ratio:[16,9],width:10}], cat: 'creative' },
  { id: "qna-1col-1-2-3-3-4-img-2-tl-3:4-3,5-mr-1:1-5", heights: [1,2,3,3,4], cols: 1, images: [{pos:'tl',ratio:[3,4],width:3.5}, {pos:'mr',ratio:[1,1],width:5}], cat: 'creative' },
  
  // Minimal templates (5 total)
  { id: "qna-1col-1-2-3-4-img-0", heights: [1,2,3,4], cols: 1, images: [], cat: 'minimal' },
  { id: "qna-1col-2-3-4-2-img-1-tr-4:3-4,5", heights: [2,3,4,2], cols: 1, images: [{pos:'tr',ratio:[4,3],width:4.5}], cat: 'minimal' },
  { id: "qna-1col-1-3-4-3-img-1-bl-1:1-5", heights: [1,3,4,3], cols: 1, images: [{pos:'bl',ratio:[1,1],width:5}], cat: 'minimal' },
  { id: "qna-1col-2-2-3-4-img-1-br-3:4-3,5", heights: [2,2,3,4], cols: 1, images: [{pos:'br',ratio:[3,4],width:3.5}], cat: 'minimal' },
  { id: "qna-1col-1-2-3-3-img-1-tl-4:3-6", heights: [1,2,3,3], cols: 1, images: [{pos:'tl',ratio:[4,3],width:6}], cat: 'minimal' }
];

function generateTemplate(template) {
  const textboxes = [];
  const elements = [];
  
  // Calculate image positions first
  const imageRects = [];
  template.images.forEach(img => {
    const size = calculateImageSize(img.width, img.ratio);
    const pos = getImagePosition(img.pos, size.width, size.height);
    imageRects.push({ x: pos.x, y: pos.y, width: size.width, height: size.height });
    elements.push({
      type: "image",
      position: pos,
      size: size,
      style: { cornerRadius: 0 }
    });
  });
  
  // Calculate textbox positions
  let currentY = MARGIN;
  const contentWidth = A4_WIDTH - 2 * MARGIN;
  const colWidth = template.cols === 2 ? (contentWidth - GAP) / 2 : contentWidth;
  
  template.heights.forEach((height, index) => {
    const row = Math.floor(index / template.cols);
    const col = index % template.cols;
    
    let x = MARGIN + col * (colWidth + GAP);
    let y = currentY;
    let width = colWidth;
    
    // Check for image overlaps and adjust
    for (const imgRect of imageRects) {
      if (y < imgRect.y + imgRect.height && y + TEXTBOX_HEIGHTS[height] > imgRect.y) {
        if (x < imgRect.x + imgRect.width && x + width > imgRect.x) {
          // Overlap detected - flow around image
          if (x < imgRect.x) {
            width = imgRect.x - x - GAP;
          } else if (x + width > imgRect.x + imgRect.width) {
            x = imgRect.x + imgRect.width + GAP;
            width = contentWidth - (x - MARGIN);
          }
        }
      }
    }
    
    textboxes.push(createTextbox(x, y, width, TEXTBOX_HEIGHTS[height], template.cat, index, template.heights.length));
    
    if (col === template.cols - 1 || index === template.heights.length - 1) {
      currentY += TEXTBOX_HEIGHTS[height] + GAP;
    }
  });
  
  const nameParts = [];
  nameParts.push(`Questions: ${template.cols} column ${template.heights.join('-')}`);
  if (template.images.length === 0) {
    nameParts.push("Image: 0");
  } else {
    template.images.forEach((img, i) => {
      const posNames = { tl: 'top left', tr: 'top right', bl: 'bottom left', br: 'bottom right', ml: 'middle left', mr: 'middle right' };
      nameParts.push(`Image ${i+1}: ${posNames[img.pos]} ${img.ratio[0]}:${img.ratio[1]} ratio ${img.width}cm wide`);
    });
  }
  
  return {
    id: template.id,
    name: nameParts.join('; '),
    category: template.cat,
    thumbnail: "/templates/default.png",
    theme: template.cat === 'sketchy' ? 'sketchy' : 'default',
    colorPalette: {
      primary: "#1976D2",
      secondary: "#42A5F5",
      accent: "#81C784",
      background: template.cat === 'minimal' ? "#FFFFFF" : "#E8F5E8",
      text: "#1A1A1A"
    },
    background: {
      type: "color",
      value: template.cat === 'minimal' ? "#FFFFFF" : "#E8F5E8",
      enabled: true
    },
    textboxes,
    elements,
    constraints: {
      minQuestions: Math.max(3, template.heights.length - 2),
      maxQuestions: Math.min(14, template.heights.length + 2),
      imageSlots: template.images.length,
      stickerSlots: 0
    }
  };
}

// Read existing file
const existing = JSON.parse(fs.readFileSync('layout.json', 'utf-8'));
const existingIds = new Set(existing.map(t => t.id));

// Generate new templates
const newTemplates = templates
  .filter(t => !existingIds.has(t.id))
  .map(generateTemplate);

// Combine and write
const allTemplates = [...existing, ...newTemplates];
fs.writeFileSync('layout.json', JSON.stringify(allTemplates, null, 2), 'utf-8');

console.log(`Generated ${newTemplates.length} new templates. Total: ${allTemplates.length}`);




