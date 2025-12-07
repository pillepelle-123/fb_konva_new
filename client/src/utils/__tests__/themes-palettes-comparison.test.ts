/**
 * Vergleichstests für Themes und Palettes zwischen Client und Server
 * Stellt sicher, dass beide die gleichen Daten aus shared/ verwenden
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Client-seitige Imports
import clientThemesData from '../../data/templates/themes';
import { colorPalettes as clientColorPalettes } from '../../data/templates/color-palettes';

// Shared-Daten direkt importieren
import sharedThemesData from '@shared/data/templates/themes.json';
import sharedColorPalettesJson from '@shared/data/templates/color-palettes.json';

describe('Themes and Palettes Comparison (Client vs. Server)', () => {
  let sharedThemes: any;
  let sharedPalettes: any;

  beforeAll(() => {
    // Normalisiere shared-Daten-Struktur
    // Themes können { themes: {...} } oder direkt {...} sein
    sharedThemes = (sharedThemesData as any)?.themes || sharedThemesData;
    
    // Palettes sind in { palettes: [...] } Struktur
    sharedPalettes = sharedColorPalettesJson?.palettes || [];
  });

  describe('Theme Data Structure', () => {
    it('should load themes data on client', () => {
      expect(clientThemesData).toBeDefined();
      expect(typeof clientThemesData).toBe('object');
    });

    it('should load themes data from shared directory', () => {
      expect(sharedThemes).toBeDefined();
      expect(typeof sharedThemes).toBe('object');
    });

    it('should have same theme IDs in client and shared', () => {
      if (!sharedThemes || !clientThemesData) {
        return; // Skip if data not available
      }

      // Normalize structure: client can have { themes: {...} } or direct {...}
      const clientThemes = (clientThemesData as any).themes || clientThemesData;

      const sharedThemeIds = Object.keys(sharedThemes).sort();
      const clientThemeIds = Object.keys(clientThemes).sort();

      expect(clientThemeIds).toEqual(sharedThemeIds);
    });

    it('should have same theme properties for each theme', () => {
      if (!sharedThemes || !clientThemesData) {
        return; // Skip if data not available
      }

      const clientThemes = (clientThemesData as any).themes || clientThemesData;
      const themeIds = Object.keys(sharedThemes);

      themeIds.forEach(themeId => {
        const sharedTheme = sharedThemes[themeId];
        const clientTheme = clientThemes[themeId];

        expect(clientTheme).toBeDefined();
        expect(clientTheme.name).toBe(sharedTheme.name);
        expect(clientTheme.description).toBe(sharedTheme.description);
        
        // Check palette reference if present
        if (sharedTheme.palette) {
          expect(clientTheme.palette).toBe(sharedTheme.palette);
        }
      });
    });

    it('should have all required theme fields', () => {
      if (!sharedThemes) {
        return; // Skip if data not available
      }

      const themeIds = Object.keys(sharedThemes);

      themeIds.forEach(themeId => {
        const theme = sharedThemes[themeId];
        expect(theme.id || themeId).toBeTruthy();
        expect(theme.name).toBeDefined();
        expect(typeof theme.name).toBe('string');
        expect(theme.description).toBeDefined();
        expect(typeof theme.description).toBe('string');
      });
    });
  });

  describe('Palette Data Structure', () => {
    it('should load palettes data on client', () => {
      expect(clientColorPalettes).toBeDefined();
      expect(Array.isArray(clientColorPalettes)).toBe(true);
      expect(clientColorPalettes.length).toBeGreaterThan(0);
    });

    it('should load palettes data from shared directory', () => {
      expect(sharedPalettes).toBeDefined();
      expect(Array.isArray(sharedPalettes)).toBe(true);
      expect(sharedPalettes.length).toBeGreaterThan(0);
    });

    it('should have same number of palettes in client and shared', () => {
      if (!sharedPalettes || !clientColorPalettes) {
        return; // Skip if data not available
      }

      expect(clientColorPalettes.length).toBe(sharedPalettes.length);
    });

    it('should have same palette IDs in client and shared', () => {
      if (!sharedPalettes || !clientColorPalettes) {
        return; // Skip if data not available
      }

      const sharedPaletteIds = sharedPalettes.map((p: any) => p.id).sort();
      const clientPaletteIds = clientColorPalettes.map(p => p.id).sort();

      expect(clientPaletteIds).toEqual(sharedPaletteIds);
    });

    it('should have same palette properties for each palette', () => {
      if (!sharedPalettes || !clientColorPalettes) {
        return; // Skip if data not available
      }

      sharedPalettes.forEach((sharedPalette: any) => {
        const clientPalette = clientColorPalettes.find(p => p.id === sharedPalette.id);

        expect(clientPalette).toBeDefined();
        expect(clientPalette?.name).toBe(sharedPalette.name);
        expect(clientPalette?.id).toBe(sharedPalette.id);

        // Check colors structure
        expect(clientPalette?.colors).toBeDefined();
        expect(typeof clientPalette?.colors).toBe('object');

        // Check required color slots
        const requiredSlots = ['primary', 'secondary', 'accent', 'text', 'background', 'surface'];
        requiredSlots.forEach(slot => {
          expect(clientPalette?.colors[slot]).toBeDefined();
          expect(clientPalette?.colors[slot]).toBe(sharedPalette.colors[slot]);
        });
      });
    });

    it('should have all required palette fields', () => {
      if (!sharedPalettes) {
        return; // Skip if data not available
      }

      sharedPalettes.forEach((palette: any) => {
        expect(palette.id).toBeDefined();
        expect(typeof palette.id).toBe('string');
        expect(palette.name).toBeDefined();
        expect(typeof palette.name).toBe('string');
        expect(palette.colors).toBeDefined();
        expect(typeof palette.colors).toBe('object');

        // Check required color slots
        const requiredSlots = ['primary', 'secondary', 'accent', 'text', 'background', 'surface'];
        requiredSlots.forEach(slot => {
          expect(palette.colors[slot]).toBeDefined();
          expect(typeof palette.colors[slot]).toBe('string');
        });
      });
    });

    it('should have valid color values in palettes', () => {
      if (!sharedPalettes) {
        return; // Skip if data not available
      }

      const colorRegex = /^#[0-9A-Fa-f]{6}$/;

      sharedPalettes.forEach((palette: any) => {
        Object.values(palette.colors).forEach((color: any) => {
          expect(typeof color).toBe('string');
          expect(colorRegex.test(color)).toBe(true);
        });
      });
    });
  });

  describe('Server-side Loading Simulation', () => {
    it('should simulate server-side theme loading', () => {
      if (!sharedThemes) {
        return; // Skip if data not available
      }

      // Simulate server-side loading logic
      const themeIds = Object.keys(sharedThemes);

      expect(themeIds.length).toBeGreaterThan(0);

      // Check that server can load each theme
      themeIds.forEach(themeId => {
        const theme = sharedThemes[themeId];
        expect(theme).toBeDefined();
        expect(theme.id || themeId).toBeTruthy();
      });
    });

    it('should simulate server-side palette loading', () => {
      if (!sharedPalettes) {
        return; // Skip if data not available
      }

      // Simulate server-side loading logic
      expect(sharedPalettes.length).toBeGreaterThan(0);

      // Check that server can load each palette
      sharedPalettes.forEach((palette: any) => {
        expect(palette.id).toBeDefined();
        expect(palette.name).toBeDefined();
        expect(palette.colors).toBeDefined();
      });
    });
  });

  describe('Data Consistency', () => {
    it('should have consistent theme-to-palette references', () => {
      if (!sharedThemes || !sharedPalettes) {
        return; // Skip if data not available
      }

      const paletteIds = sharedPalettes.map((p: any) => p.id);

      Object.values(sharedThemes).forEach((theme: any) => {
        if (theme.palette) {
          expect(paletteIds).toContain(theme.palette);
        }
      });
    });

    it('should have unique palette IDs', () => {
      if (!sharedPalettes) {
        return; // Skip if data not available
      }

      const paletteIds = sharedPalettes.map((p: any) => p.id);
      const uniqueIds = new Set(paletteIds);

      expect(uniqueIds.size).toBe(paletteIds.length);
    });

    it('should have unique theme IDs', () => {
      if (!sharedThemes) {
        return; // Skip if data not available
      }

      const themeIds = Object.keys(sharedThemes);
      const uniqueIds = new Set(themeIds);

      expect(uniqueIds.size).toBe(themeIds.length);
    });
  });
});
