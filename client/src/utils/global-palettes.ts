import type { ColorPalette } from '../types/template-types';

// Note: GLOBAL_PALETTES is legacy and may not include 'text' field.
// The actual ColorPalette interface is in template-types.ts

export const GLOBAL_PALETTES: ColorPalette[] = [
  // Light Palettes
  { id: 'soft-pastels', name: 'Soft Pastels', colors: { primary: '#FFB3BA', secondary: '#FFDFBA', accent: '#FFFFBA', background: '#BAFFC9', surface: '#BAE1FF' }, category: 'Light' },
  { id: 'cream-dream', name: 'Cream Dream', colors: { primary: '#F7E7CE', secondary: '#E8D5B7', accent: '#B8860B', background: '#FFF8DC', surface: '#FAEBD7' }, category: 'Light' },
  { id: 'powder-blue', name: 'Powder Blue', colors: { primary: '#B0E0E6', secondary: '#E0F6FF', accent: '#87CEEB', background: '#F0F8FF', surface: '#E6F3FF' }, category: 'Light' },
  { id: 'mint-fresh', name: 'Mint Fresh', colors: { primary: '#98FB98', secondary: '#F0FFF0', accent: '#00FF7F', background: '#F5FFFA', surface: '#E0FFE0' }, category: 'Light' },
  { id: 'blush-pink', name: 'Blush Pink', colors: { primary: '#FFB6C1', secondary: '#FFF0F5', accent: '#FF69B4', background: '#FDF2F8', surface: '#FCE7F3' }, category: 'Light' },
  { id: 'neutral-harmony', name: 'Neutral Harmony', colors: { primary: '#81b29a', secondary: '#3d405b', accent: '#e07a5f', background: '#f4f1de', surface: '#f2cc8f' }, category: 'Light' },

  // Dark Palettes
  { id: 'midnight-blue', name: 'Midnight Blue', colors: { primary: '#191970', secondary: '#000080', accent: '#4169E1', background: '#0F0F23', surface: '#1E1E3F' }, category: 'Dark' },
  { id: 'charcoal-grey', name: 'Charcoal Grey', colors: { primary: '#36454F', secondary: '#2F4F4F', accent: '#708090', background: '#1C1C1C', surface: '#2E2E2E' }, category: 'Dark' },
  { id: 'deep-forest', name: 'Deep Forest', colors: { primary: '#013220', secondary: '#355E3B', accent: '#228B22', background: '#0B1426', surface: '#1B2631' }, category: 'Dark' },
  { id: 'burgundy-wine', name: 'Burgundy Wine', colors: { primary: '#800020', secondary: '#722F37', accent: '#B22222', background: '#2C1810', surface: '#3D2914' }, category: 'Dark' },
  { id: 'navy-storm', name: 'Navy Storm', colors: { primary: '#2C3E50', secondary: '#34495E', accent: '#5D6D7E', background: '#1B2631', surface: '#273746' }, category: 'Dark' },

  // Less Saturated
  { id: 'muted-earth', name: 'Muted Earth', colors: { primary: '#8B7355', secondary: '#A0826D', accent: '#CD853F', background: '#F5F5DC', surface: '#DDBF94' }, category: 'Muted' },
  { id: 'sage-green', name: 'Sage Green', colors: { primary: '#9CAF88', secondary: '#87A96B', accent: '#6B8E23', background: '#F0F8E8', surface: '#E8F5E8' }, category: 'Muted' },
  { id: 'dusty-rose', name: 'Dusty Rose', colors: { primary: '#C4A484', secondary: '#D2B48C', accent: '#BC8F8F', background: '#FDF5E6', surface: '#F5DEB3' }, category: 'Muted' },
  { id: 'stone-grey', name: 'Stone Grey', colors: { primary: '#918B89', secondary: '#A8A8A8', accent: '#696969', background: '#F8F8FF', surface: '#DCDCDC' }, category: 'Muted' },
  { id: 'faded-denim', name: 'Faded Denim', colors: { primary: '#6F8FAF', secondary: '#4682B4', accent: '#5F9EA0', background: '#F0F8FF', surface: '#E6F3FF' }, category: 'Muted' },

  // Colorful Palettes
  { id: 'rainbow-bright', name: 'Rainbow Bright', colors: { primary: '#FF6B6B', secondary: '#4ECDC4', accent: '#45B7D1', background: '#FFF9C4', surface: '#F9CA24' }, category: 'Colorful' },
  { id: 'tropical-sunset', name: 'Tropical Sunset', colors: { primary: '#FF6B35', secondary: '#F7931E', accent: '#FFD23F', background: '#06FFA5', surface: '#4ECDC4' }, category: 'Colorful' },
  { id: 'electric-pop', name: 'Electric Pop', colors: { primary: '#FF0080', secondary: '#00FF80', accent: '#8000FF', background: '#FFFF00', surface: '#00FFFF' }, category: 'Colorful' },
  { id: 'festival-vibes', name: 'Festival Vibes', colors: { primary: '#E74C3C', secondary: '#F39C12', accent: '#9B59B6', background: '#2ECC71', surface: '#3498DB' }, category: 'Colorful' },
  { id: 'neon-nights', name: 'Neon Nights', colors: { primary: '#FF073A', secondary: '#39FF14', accent: '#FF6EC7', background: '#FFFF33', surface: '#00FFFF' }, category: 'Colorful' },

  // Single/Dual Color
  { id: 'monochrome-blue', name: 'Monochrome Blue', colors: { primary: '#1E3A8A', secondary: '#3B82F6', accent: '#60A5FA', background: '#DBEAFE', surface: '#EFF6FF' }, category: 'Monochrome' },
  { id: 'green-gradient', name: 'Green Gradient', colors: { primary: '#065F46', secondary: '#059669', accent: '#10B981', background: '#D1FAE5', surface: '#ECFDF5' }, category: 'Monochrome' },
  { id: 'red-spectrum', name: 'Red Spectrum', colors: { primary: '#991B1B', secondary: '#DC2626', accent: '#F87171', background: '#FEE2E2', surface: '#FEF2F2' }, category: 'Monochrome' },
  { id: 'purple-haze', name: 'Purple Haze', colors: { primary: '#581C87', secondary: '#7C3AED', accent: '#A78BFA', background: '#EDE9FE', surface: '#F3F4F6' }, category: 'Monochrome' },
  { id: 'orange-crush', name: 'Orange Crush', colors: { primary: '#C2410C', secondary: '#EA580C', accent: '#FB923C', background: '#FED7AA', surface: '#FFF7ED' }, category: 'Monochrome' },

  // Greyscale
  { id: 'classic-grey', name: 'Classic Grey', colors: { primary: '#374151', secondary: '#6B7280', accent: '#9CA3AF', background: '#F9FAFB', surface: '#F3F4F6' }, category: 'Greyscale' },
  { id: 'silver-scale', name: 'Silver Scale', colors: { primary: '#1F2937', secondary: '#4B5563', accent: '#D1D5DB', background: '#FFFFFF', surface: '#F9FAFB' }, category: 'Greyscale' },
  { id: 'charcoal-light', name: 'Charcoal Light', colors: { primary: '#111827', secondary: '#374151', accent: '#9CA3AF', background: '#F9FAFB', surface: '#E5E7EB' }, category: 'Greyscale' },

  // High Contrast
  { id: 'black-white', name: 'Black & White', colors: { primary: '#000000', secondary: '#FFFFFF', accent: '#808080', background: '#F5F5F5', surface: '#E0E0E0' }, category: 'High Contrast' },
  { id: 'fire-ice', name: 'Fire & Ice', colors: { primary: '#FF0000', secondary: '#00FFFF', accent: '#FFFFFF', background: '#000000', surface: '#808080' }, category: 'High Contrast' },
  { id: 'electric-contrast', name: 'Electric Contrast', colors: { primary: '#FFFF00', secondary: '#FF00FF', accent: '#00FF00', background: '#000000', surface: '#FFFFFF' }, category: 'High Contrast' },

  // Spring
  { id: 'spring-bloom', name: 'Spring Bloom', colors: { primary: '#98FB98', secondary: '#FFB6C1', accent: '#FFFFE0', background: '#F0FFF0', surface: '#E0FFE0' }, category: 'Spring' },
  { id: 'cherry-blossom', name: 'Cherry Blossom', colors: { primary: '#FFB7C5', secondary: '#FFC0CB', accent: '#FFCCCB', background: '#FFF0F5', surface: '#FFEEF0' }, category: 'Spring' },
  { id: 'fresh-grass', name: 'Fresh Grass', colors: { primary: '#9ACD32', secondary: '#ADFF2F', accent: '#7CFC00', background: '#F0FFF0', surface: '#E6FFE6' }, category: 'Spring' },

  // Summer
  { id: 'ocean-breeze', name: 'Ocean Breeze', colors: { primary: '#00CED1', secondary: '#20B2AA', accent: '#48D1CC', background: '#E0FFFF', surface: '#F0FFFF' }, category: 'Summer' },
  { id: 'sunny-day', name: 'Sunny Day', colors: { primary: '#FFD700', secondary: '#FFA500', accent: '#FF8C00', background: '#FFFACD', surface: '#FFEFD5' }, category: 'Summer' },
  { id: 'tropical-beach', name: 'Tropical Beach', colors: { primary: '#FF7F50', secondary: '#20B2AA', accent: '#FFD700', background: '#F0FFFF', surface: '#E0FFFF' }, category: 'Summer' },

  // Autumn
  { id: 'autumn-leaves', name: 'Autumn Leaves', colors: { primary: '#D2691E', secondary: '#CD853F', accent: '#DEB887', background: '#FFF8DC', surface: '#FFEFD5' }, category: 'Autumn' },
  { id: 'harvest-moon', name: 'Harvest Moon', colors: { primary: '#B22222', secondary: '#CD853F', accent: '#DAA520', background: '#FDF5E6', surface: '#F5DEB3' }, category: 'Autumn' },
  { id: 'pumpkin-spice', name: 'Pumpkin Spice', colors: { primary: '#FF4500', secondary: '#D2691E', accent: '#CD853F', background: '#FFEFD5', surface: '#FFDAB9' }, category: 'Autumn' },

  // Winter
  { id: 'winter-frost', name: 'Winter Frost', colors: { primary: '#4682B4', secondary: '#B0C4DE', accent: '#E6E6FA', background: '#F8F8FF', surface: '#F0F8FF' }, category: 'Winter' },
  { id: 'snow-day', name: 'Snow Day', colors: { primary: '#708090', secondary: '#C0C0C0', accent: '#DCDCDC', background: '#FFFAFA', surface: '#F8F8FF' }, category: 'Winter' },
  { id: 'ice-crystal', name: 'Ice Crystal', colors: { primary: '#4169E1', secondary: '#87CEEB', accent: '#E0F6FF', background: '#F0F8FF', surface: '#E6F3FF' }, category: 'Winter' },

  // Holiday Themes
  { id: 'christmas-joy', name: 'Christmas Joy', colors: { primary: '#DC143C', secondary: '#228B22', accent: '#FFD700', background: '#F5F5F5', surface: '#FFFFFF' }, category: 'Christmas' },
  { id: 'valentine-love', name: 'Valentine Love', colors: { primary: '#FF1493', secondary: '#FF69B4', accent: '#FFB6C1', background: '#FFF0F5', surface: '#FFCCCB' }, category: 'Valentine' },
  { id: 'easter-pastel', name: 'Easter Pastel', colors: { primary: '#DDA0DD', secondary: '#98FB98', accent: '#FFFFE0', background: '#F5F5DC', surface: '#FFF8DC' }, category: 'Easter' },
  { id: 'halloween-spook', name: 'Halloween Spook', colors: { primary: '#FF4500', secondary: '#000000', accent: '#8B008B', background: '#2F4F4F', surface: '#696969' }, category: 'Halloween' },
  { id: 'oktoberfest-bavaria', name: 'Oktoberfest Bavaria', colors: { primary: '#0066CC', secondary: '#FFFFFF', accent: '#DAA520', background: '#F0F8FF', surface: '#E6F3FF' }, category: 'Oktoberfest' },

  // Wedding Themes
  { id: 'elegant-white', name: 'Elegant White', colors: { primary: '#FFFFFF', secondary: '#F8F8FF', accent: '#E6E6FA', background: '#FFFAFA', surface: '#F5F5F5' }, category: 'Wedding' },
  { id: 'romantic-blush', name: 'Romantic Blush', colors: { primary: '#FFB6C1', secondary: '#FFC0CB', accent: '#FFCCCB', background: '#FFF0F5', surface: '#FFEEF0' }, category: 'Wedding' },
  { id: 'garden-party', name: 'Garden Party', colors: { primary: '#98FB98', secondary: '#FFB6C1', accent: '#FFFFE0', background: '#F0FFF0', surface: '#E0FFE0' }, category: 'Wedding' },

  // Birthday Themes
  { id: 'birthday-party', name: 'Birthday Party', colors: { primary: '#FF69B4', secondary: '#00CED1', accent: '#FFD700', background: '#FFFACD', surface: '#F0FFFF' }, category: 'Birthday' },
  { id: 'confetti-fun', name: 'Confetti Fun', colors: { primary: '#FF6347', secondary: '#32CD32', accent: '#FF1493', background: '#FFFFE0', surface: '#F0F8FF' }, category: 'Birthday' },
  { id: 'balloon-bright', name: 'Balloon Bright', colors: { primary: '#FF4500', secondary: '#9370DB', accent: '#00FA9A', background: '#FFFACD', surface: '#E0FFFF' }, category: 'Birthday' },

  // Default Theme Palettes
  { id: 'default-palette', name: 'Default', colors: { primary: '#16697a', secondary: '#489fb5', accent: '#82c0cc', background: '#ede7e3', surface: '#ffa62b' }, category: 'Default' },
  { id: 'rough-palette', name: 'Rough', colors: { primary: '#00a6fb', secondary: '#0582ca', accent: '#006494', background: '#003554', surface: '#051923' }, category: 'Default' },
  { id: 'glow-palette', name: 'Glow', colors: { primary: '#3c1642', secondary: '#086375', accent: '#1dd3b0', background: '#affc41', surface: '#b2ff9e' }, category: 'Default' },
  { id: 'candy-palette', name: 'Candy', colors: { primary: '#ef476f', secondary: '#ffd166', accent: '#06d6a0', background: '#118ab2', surface: '#073b4c' }, category: 'Default' },
  { id: 'zigzag-palette', name: 'Zigzag', colors: { primary: '#50514f', secondary: '#f25f5c', accent: '#ffe066', background: '#247ba0', surface: '#70c1b3' }, category: 'Default' },
  { id: 'wobbly-palette', name: 'Wobbly', colors: { primary: '#6f2dbd', secondary: '#a663cc', accent: '#b298dc', background: '#b8d0eb', surface: '#b9faf8' }, category: 'Default' },
  { id: 'sketchy-palette', name: 'Sketchy', colors: { primary: '#e0fbfc', secondary: '#c2dfe3', accent: '#9db4c0', background: '#5c6b73', surface: '#253237' }, category: 'Default' },
  { id: 'professional-palette', name: 'Professional', colors: { primary: '#ff6700', secondary: '#ebebeb', accent: '#c0c0c0', background: '#3a6ea5', surface: '#004e98' }, category: 'Default' },
  { id: 'playful-palette', name: 'Playful', colors: { primary: '#ff595e', secondary: '#ffca3a', accent: '#8ac926', background: '#1982c4', surface: '#6a4c93' }, category: 'Default' },
  { id: 'vintage-palette', name: 'Vintage', colors: { primary: '#cebebe', secondary: '#ece2d0', accent: '#d5b9b2', background: '#a26769', surface: '#6d2e46' }, category: 'Default' },
  
  // New mood-focused palettes
  { id: 'energetic', name: 'Energetic', colors: { primary: '#FF4081', secondary: '#FF9800', accent: '#FFEB3B', background: '#FFF3E0', surface: '#FFE0B2' }, category: 'Mood' },
  { id: 'calm', name: 'Calm', colors: { primary: '#4FC3F7', secondary: '#81C784', accent: '#AED581', background: '#E8F5E8', surface: '#E1F5FE' }, category: 'Mood' },
  { id: 'mysterious', name: 'Mysterious', colors: { primary: '#7E57C2', secondary: '#5C6BC0', accent: '#42A5F5', background: '#1A1A2E', surface: '#16213E' }, category: 'Mood' },
  { id: 'warm', name: 'Warm', colors: { primary: '#FF7043', secondary: '#FFAB40', accent: '#FFD54F', background: '#FFF8E1', surface: '#FFECB3' }, category: 'Mood' },
  { id: 'elegant', name: 'Elegant', colors: { primary: '#8D6E63', secondary: '#A1887F', accent: '#D7CCC8', background: '#EFEBE9', surface: '#F5F5F5' }, category: 'Mood' }
];

export function getPalette(id: string): ColorPalette | undefined {
  return GLOBAL_PALETTES.find(palette => palette.id === id);
}

export function getPalettesByCategory(category: string): ColorPalette[] {
  return GLOBAL_PALETTES.filter(palette => palette.category === category);
}

export function getAllCategories(): string[] {
  return [...new Set(GLOBAL_PALETTES.map(palette => palette.category))];
}

export function applyPaletteToElement(palette: ColorPalette, elementType: string): Partial<any> {
  const updates: any = {};
  
  switch (elementType) {
    case 'text':
      updates.fill = palette.colors.primary;
      updates.stroke = palette.colors.primary;
      updates.fontColor = palette.colors.primary;
      updates.borderColor = palette.colors.secondary;
      updates.backgroundColor = palette.colors.background;
      updates.ruledLinesColor = palette.colors.accent;
      // Nested properties
      updates.font = { fontColor: palette.colors.primary };
      updates.border = { borderColor: palette.colors.secondary };
      updates.background = { backgroundColor: palette.colors.background };
      updates.ruledLines = { lineColor: palette.colors.accent };
      break;
      
    case 'question':
      updates.fill = palette.colors.primary;
      updates.stroke = palette.colors.primary;
      updates.fontColor = palette.colors.primary;
      updates.borderColor = palette.colors.secondary;
      updates.backgroundColor = palette.colors.surface;
      updates.ruledLinesColor = palette.colors.accent;
      updates.font = { fontColor: palette.colors.primary };
      updates.border = { borderColor: palette.colors.secondary };
      updates.background = { backgroundColor: palette.colors.surface };
      updates.ruledLines = { lineColor: palette.colors.accent };
      break;
      
    case 'answer':
      updates.fill = palette.colors.accent;
      updates.stroke = palette.colors.accent;
      updates.fontColor = palette.colors.accent;
      updates.borderColor = palette.colors.secondary;
      updates.backgroundColor = palette.colors.background;
      updates.ruledLinesColor = palette.colors.primary;
      updates.font = { fontColor: palette.colors.accent };
      updates.border = { borderColor: palette.colors.secondary };
      updates.background = { backgroundColor: palette.colors.background };
      updates.ruledLines = { lineColor: palette.colors.primary };
      break;
      
    case 'qna_inline':
      // Font properties only in questionSettings/answerSettings (no nested font object)
      // Shared properties (borderColor, backgroundColor, etc.) are set on top-level
      updates.questionSettings = {
        fontColor: palette.colors.text
      };
      updates.answerSettings = {
        fontColor: palette.colors.text
      };
      // Set shared properties on top-level
      updates.borderColor = palette.colors.primary;
      updates.backgroundColor = palette.colors.accent;
      updates.ruledLinesColor = palette.colors.primary;
      break;
      
    case 'free_text':
      updates.textSettings = {
        fontColor: palette.colors.text,
        font: { fontColor: palette.colors.text },
        borderColor: palette.colors.primary,
        border: { borderColor: palette.colors.primary },
        backgroundColor: palette.colors.accent,
        background: { backgroundColor: palette.colors.accent },
        ruledLinesColor: palette.colors.primary,
        ruledLines: { lineColor: palette.colors.primary }
      };
      // Also set top-level properties for backward compatibility
      updates.fontColor = palette.colors.text;
      updates.borderColor = palette.colors.primary;
      updates.backgroundColor = palette.colors.accent;
      break;
      
    case 'brush':
    case 'line':
      updates.stroke = palette.colors.primary;
      break;
      
    case 'rect':
    case 'circle':
    case 'heart':
    case 'star':
    case 'speech-bubble':
    case 'dog':
    case 'cat':
    case 'smiley':
    case 'triangle':
    case 'polygon':
    case 'sticker':
      updates.stroke = palette.colors.primary;
      updates.fill = palette.colors.surface;
      break;
      
    case 'image':
    case 'placeholder':
      updates.borderColor = palette.colors.secondary;
      updates.backgroundColor = palette.colors.background;
      break;
  }
  
  return updates;
}

export function applyPaletteToAllElements(palette: ColorPalette, elements: any[]): any[] {
  return elements.map(element => {
    const elementType = element.textType || element.type;
    const colorUpdates = applyPaletteToElement(palette, elementType);
    
    // Deep merge color properties while preserving non-color properties
    const updatedElement = { ...element };
    
    // Apply flat color properties
    Object.keys(colorUpdates).forEach(key => {
      if (key === 'font' || key === 'border' || key === 'background' || key === 'ruledLines' || key === 'questionSettings' || key === 'answerSettings' || key === 'textSettings') {
        // Merge nested objects
        updatedElement[key] = { ...updatedElement[key], ...colorUpdates[key] };
      } else {
        // Apply flat properties
        updatedElement[key] = colorUpdates[key];
      }
    });
    
    return updatedElement;
  });
}

export function applyPaletteToPage(palette: ColorPalette, pageBackground: any): any {
  const updates = { ...pageBackground };
  
  // Update background colors only, preserve type and other settings
  if (updates.type === 'color') {
    updates.value = palette.colors.background;
  } else if (updates.type === 'pattern') {
    // patternBackgroundColor = color of the pattern itself (dots, lines)
    // patternForegroundColor = color of the space between patterns
    updates.patternBackgroundColor = palette.colors.primary;
    updates.patternForegroundColor = palette.colors.background;
  }
  
  return updates;
}