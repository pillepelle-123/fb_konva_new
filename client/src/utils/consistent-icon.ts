import {
  BookOpen, BookMarked, Bookmark, Star, Heart, Feather, Camera,
  Music, Compass, Globe, Map, Mountain, Sun, Moon, Cloud, Leaf, Bird,
  Plane, Home, Flame, Snowflake, Fish, Sparkles, GraduationCap,
  Rocket, Trophy, Crown, PenLine, Flower, TreePine, Palette,
  Coffee, Diamond, Anchor, Telescope, Microscope, Brain, Zap,
  Waves, Wind, Rainbow, Gem
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const icons: LucideIcon[] = [
  BookOpen, BookMarked, Bookmark, Star, Heart, Feather, Camera,
  Music, Compass, Globe, Map, Mountain, Sun, Moon, Cloud, Leaf, Bird,
  Plane, Home, Flame, Snowflake, Fish, Sparkles, GraduationCap,
  Rocket, Trophy, Crown, PenLine, Flower, TreePine, Palette,
  Coffee, Diamond, Anchor, Telescope, Microscope, Brain, Zap,
  Waves, Wind, Rainbow, Gem
];

export function getConsistentIcon(name: string): LucideIcon {
  const normalized = name || '';
  const seed = normalized.slice(-3) || normalized;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return icons[Math.abs(hash) % icons.length];
}
