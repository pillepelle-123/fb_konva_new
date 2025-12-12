export interface OpenMojiSticker {
  emoji: string;
  hexcode: string;
  category: string;
  name: string;
  tags: string[];
  subgroup?: string;
}

// OpenMoji-Version für CDN-URLs
export const OPENMOJI_VERSION = '15.0.0';

// Kuratierte Auswahl beliebter OpenMoji-SVGs (~100 Stück)
export const OPENMOJI_STICKERS: OpenMojiSticker[] = [
  // Tiere (10 Stück)
  { emoji: '🐶', hexcode: '1F436', category: 'animals', name: 'Dog', tags: ['animal', 'pet', 'dog'] },
  { emoji: '🐱', hexcode: '1F431', category: 'animals', name: 'Cat', tags: ['animal', 'pet', 'cat'] },
  { emoji: '🐭', hexcode: '1F42D', category: 'animals', name: 'Mouse', tags: ['animal', 'mouse', 'rodent'] },
  { emoji: '🐹', hexcode: '1F439', category: 'animals', name: 'Hamster', tags: ['animal', 'pet', 'hamster'] },
  { emoji: '🐰', hexcode: '1F430', category: 'animals', name: 'Rabbit', tags: ['animal', 'pet', 'rabbit', 'bunny'] },
  { emoji: '🦊', hexcode: '1F98A', category: 'animals', name: 'Fox', tags: ['animal', 'fox', 'wild'] },
  { emoji: '🐻', hexcode: '1F43B', category: 'animals', name: 'Bear', tags: ['animal', 'bear', 'wild'] },
  { emoji: '🐼', hexcode: '1F43C', category: 'animals', name: 'Panda', tags: ['animal', 'panda', 'bear'] },
  { emoji: '🐨', hexcode: '1F428', category: 'animals', name: 'Koala', tags: ['animal', 'koala', 'australia'] },
  { emoji: '🐯', hexcode: '1F42F', category: 'animals', name: 'Tiger', tags: ['animal', 'tiger', 'wild', 'cat'] },

  // Essen (10 Stück)
  { emoji: '🍎', hexcode: '1F34E', category: 'food', name: 'Apple', tags: ['food', 'fruit', 'red'] },
  { emoji: '🍌', hexcode: '1F34C', category: 'food', name: 'Banana', tags: ['food', 'fruit', 'yellow'] },
  { emoji: '🍊', hexcode: '1F34A', category: 'food', name: 'Orange', tags: ['food', 'fruit', 'orange'] },
  { emoji: '🍓', hexcode: '1F353', category: 'food', name: 'Strawberry', tags: ['food', 'fruit', 'red', 'berry'] },
  { emoji: '🍕', hexcode: '1F355', category: 'food', name: 'Pizza', tags: ['food', 'pizza', 'italian'] },
  { emoji: '🍔', hexcode: '1F354', category: 'food', name: 'Burger', tags: ['food', 'burger', 'hamburger'] },
  { emoji: '🌭', hexcode: '1F32D', category: 'food', name: 'Hot Dog', tags: ['food', 'hotdog', 'sausage'] },
  { emoji: '🍟', hexcode: '1F35F', category: 'food', name: 'French Fries', tags: ['food', 'fries', 'potato'] },
  { emoji: '🍦', hexcode: '1F366', category: 'food', name: 'Ice Cream', tags: ['food', 'icecream', 'dessert', 'sweet'] },
  { emoji: '🍪', hexcode: '1F36A', category: 'food', name: 'Cookie', tags: ['food', 'cookie', 'dessert', 'sweet'] },

  // Gesichter/Emotionen (10 Stück)
  { emoji: '😀', hexcode: '1F600', category: 'faces', name: 'Grinning Face', tags: ['face', 'smile', 'happy', 'grin'] },
  { emoji: '😃', hexcode: '1F603', category: 'faces', name: 'Grinning Face with Big Eyes', tags: ['face', 'smile', 'happy', 'grin', 'eyes'] },
  { emoji: '😄', hexcode: '1F604', category: 'faces', name: 'Grinning Face with Smiling Eyes', tags: ['face', 'smile', 'happy', 'grin', 'eyes'] },
  { emoji: '😁', hexcode: '1F601', category: 'faces', name: 'Beaming Face with Smiling Eyes', tags: ['face', 'smile', 'happy', 'beam', 'eyes'] },
  { emoji: '😆', hexcode: '1F606', category: 'faces', name: 'Grinning Squinting Face', tags: ['face', 'smile', 'happy', 'grin', 'squint'] },
  { emoji: '😅', hexcode: '1F605', category: 'faces', name: 'Grinning Face with Sweat', tags: ['face', 'smile', 'happy', 'grin', 'sweat'] },
  { emoji: '😂', hexcode: '1F602', category: 'faces', name: 'Face with Tears of Joy', tags: ['face', 'joy', 'tears', 'laugh', 'happy'] },
  { emoji: '🤣', hexcode: '1F923', category: 'faces', name: 'Rolling on the Floor Laughing', tags: ['face', 'laugh', 'rolling', 'floor', 'joy'] },
  { emoji: '😊', hexcode: '1F60A', category: 'faces', name: 'Smiling Face with Smiling Eyes', tags: ['face', 'smile', 'happy', 'eyes'] },
  { emoji: '😇', hexcode: '1F607', category: 'faces', name: 'Smiling Face with Halo', tags: ['face', 'smile', 'halo', 'angel', 'innocent'] },

  // Objekte (10 Stück)
  { emoji: '❤️', hexcode: '2764-FE0F', category: 'objects', name: 'Red Heart', tags: ['heart', 'love', 'red'] },
  { emoji: '💛', hexcode: '1F49B', category: 'objects', name: 'Yellow Heart', tags: ['heart', 'love', 'yellow'] },
  { emoji: '💚', hexcode: '1F49A', category: 'objects', name: 'Green Heart', tags: ['heart', 'love', 'green'] },
  { emoji: '💙', hexcode: '1F499', category: 'objects', name: 'Blue Heart', tags: ['heart', 'love', 'blue'] },
  { emoji: '💜', hexcode: '1F49C', category: 'objects', name: 'Purple Heart', tags: ['heart', 'love', 'purple'] },
  { emoji: '🎈', hexcode: '1F388', category: 'objects', name: 'Balloon', tags: ['balloon', 'party', 'celebration'] },
  { emoji: '🎂', hexcode: '1F382', category: 'objects', name: 'Birthday Cake', tags: ['cake', 'birthday', 'party', 'celebration'] },
  { emoji: '🎁', hexcode: '1F381', category: 'objects', name: 'Wrapped Gift', tags: ['gift', 'present', 'wrapped', 'box'] },
  { emoji: '⭐', hexcode: '2B50', category: 'objects', name: 'Star', tags: ['star', 'favorite', 'rating'] },
  { emoji: '🌟', hexcode: '1F31F', category: 'objects', name: 'Glowing Star', tags: ['star', 'glow', 'shine', 'sparkle'] },

  // Aktivitäten (10 Stück)
  { emoji: '⚽', hexcode: '26BD', category: 'activities', name: 'Soccer Ball', tags: ['soccer', 'football', 'ball', 'sport'] },
  { emoji: '🏀', hexcode: '1F3C0', category: 'activities', name: 'Basketball', tags: ['basketball', 'ball', 'sport'] },
  { emoji: '🏈', hexcode: '1F3C8', category: 'activities', name: 'American Football', tags: ['football', 'american', 'ball', 'sport'] },
  { emoji: '🎾', hexcode: '1F3BE', category: 'activities', name: 'Tennis', tags: ['tennis', 'ball', 'sport', 'racket'] },
  { emoji: '🎯', hexcode: '1F3AF', category: 'activities', name: 'Bullseye', tags: ['dart', 'target', 'bullseye', 'game'] },
  { emoji: '🎲', hexcode: '1F3B2', category: 'activities', name: 'Game Die', tags: ['dice', 'die', 'game', 'gambling'] },
  { emoji: '🎮', hexcode: '1F3AE', category: 'activities', name: 'Video Game', tags: ['game', 'controller', 'gaming', 'playstation'] },
  { emoji: '🎵', hexcode: '1F3B5', category: 'activities', name: 'Musical Note', tags: ['music', 'note', 'sound', 'audio'] },
  { emoji: '🎶', hexcode: '1F3B6', category: 'activities', name: 'Musical Notes', tags: ['music', 'notes', 'sound', 'audio'] },
  { emoji: '🎤', hexcode: '1F3A4', category: 'activities', name: 'Microphone', tags: ['microphone', 'music', 'sing', 'audio'] },

  // Natur (10 Stück)
  { emoji: '🌞', hexcode: '1F31E', category: 'nature', name: 'Sun with Face', tags: ['sun', 'face', 'weather', 'bright'] },
  { emoji: '🌈', hexcode: '1F308', category: 'nature', name: 'Rainbow', tags: ['rainbow', 'weather', 'colorful', 'nature'] },
  { emoji: '☁️', hexcode: '2601-FE0F', category: 'nature', name: 'Cloud', tags: ['cloud', 'weather', 'sky'] },
  { emoji: '🌧️', hexcode: '1F327-FE0F', category: 'nature', name: 'Cloud with Rain', tags: ['rain', 'cloud', 'weather', 'storm'] },
  { emoji: '❄️', hexcode: '2744-FE0F', category: 'nature', name: 'Snowflake', tags: ['snow', 'winter', 'cold', 'weather'] },
  { emoji: '🌸', hexcode: '1F338', category: 'nature', name: 'Cherry Blossom', tags: ['flower', 'cherry', 'blossom', 'spring', 'pink'] },
  { emoji: '🌺', hexcode: '1F33A', category: 'nature', name: 'Hibiscus', tags: ['flower', 'hibiscus', 'tropical', 'pink'] },
  { emoji: '🌻', hexcode: '1F33B', category: 'nature', name: 'Sunflower', tags: ['flower', 'sunflower', 'yellow', 'sun'] },
  { emoji: '🌹', hexcode: '1F339', category: 'nature', name: 'Rose', tags: ['flower', 'rose', 'red', 'love'] },
  { emoji: '🌷', hexcode: '1F337', category: 'nature', name: 'Tulip', tags: ['flower', 'tulip', 'pink', 'spring'] },

  // Zusätzliche beliebte Sticker (10 Stück)
  { emoji: '🚗', hexcode: '1F697', category: 'travel', name: 'Car', tags: ['car', 'vehicle', 'drive', 'transport'] },
  { emoji: '🏠', hexcode: '1F3E0', category: 'buildings', name: 'House', tags: ['house', 'home', 'building', 'residence'] },
  { emoji: '📚', hexcode: '1F4DA', category: 'objects', name: 'Books', tags: ['books', 'library', 'education', 'reading'] },
  { emoji: '💡', hexcode: '1F4A1', category: 'objects', name: 'Light Bulb', tags: ['light', 'bulb', 'idea', 'bright'] },
  { emoji: '🔥', hexcode: '1F525', category: 'nature', name: 'Fire', tags: ['fire', 'flame', 'hot', 'burn'] },
  { emoji: '💎', hexcode: '1F48E', category: 'objects', name: 'Gem Stone', tags: ['gem', 'diamond', 'jewel', 'precious'] },
  { emoji: '🏆', hexcode: '1F3C6', category: 'activities', name: 'Trophy', tags: ['trophy', 'award', 'winner', 'prize'] },
  { emoji: '🎨', hexcode: '1F3A8', category: 'activities', name: 'Artist Palette', tags: ['art', 'palette', 'paint', 'creative'] },
  { emoji: '📱', hexcode: '1F4F1', category: 'objects', name: 'Mobile Phone', tags: ['phone', 'mobile', 'device', 'technology'] },
  { emoji: '🌙', hexcode: '1F319', category: 'nature', name: 'Crescent Moon', tags: ['moon', 'night', 'crescent', 'sky'] },
];

// CDN-URL-Generator für OpenMoji-SVGs
export function getOpenMojiUrl(hexcode: string, version = OPENMOJI_VERSION): string {
  return `https://cdn.jsdelivr.net/npm/openmoji@${version}/color/svg/${hexcode}.svg`;
}

// Suche in OpenMoji-Stickern
export function searchOpenMojiStickers(query: string): OpenMojiSticker[] {
  if (!query.trim()) return OPENMOJI_STICKERS;

  const lowercaseQuery = query.toLowerCase();
  return OPENMOJI_STICKERS.filter(sticker =>
    sticker.name.toLowerCase().includes(lowercaseQuery) ||
    sticker.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
    sticker.category.toLowerCase().includes(lowercaseQuery) ||
    sticker.emoji.includes(query)
  );
}

// Sticker nach Kategorie filtern
export function getOpenMojiStickersByCategory(category: string): OpenMojiSticker[] {
  if (category === 'all') return OPENMOJI_STICKERS;
  return OPENMOJI_STICKERS.filter(sticker => sticker.category === category);
}

// Alle verfügbaren Kategorien
export function getOpenMojiCategories(): string[] {
  const categories = new Set(OPENMOJI_STICKERS.map(sticker => sticker.category));
  return Array.from(categories).sort();
}
