const express = require('express');
const { Pool } = require('pg');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { generatePDFFromBook } = require('../services/pdf-export');
const PDFExportQueue = require('../services/pdf-export-queue');
const { getUploadsDir, getUploadsSubdir, isPathWithinUploads } = require('../utils/uploads-path');
const { formatLayoutIdForResponse } = require('../utils/layout-utils');
const stickersService = require('../services/stickers');
const backgroundImagesService = require('../services/background-images');
const backgroundImageDesignerService = require('../services/background-image-designer');
const sharp = require('sharp');
const themesPalettesService = require('../services/themes-palettes-layouts');

const router = express.Router();

/** Apply palette colors to page backgrounds for PDF export (server-side, no client fetch) */
async function applyPaletteToBookData(bookData) {
  let palettes = [];
  let themes = [];
  let backgroundImages = [];
  try {
    [palettes, themes, backgroundImages] = await Promise.all([
      themesPalettesService.listColorPalettes(),
      themesPalettesService.listThemes(),
      backgroundImagesService.listBackgroundImages()
    ]);
  } catch (err) {
    console.warn('[pdf-exports] Failed to load palettes/themes/backgroundImages:', err.message);
    return bookData;
  }

  // Embed SVG raw content for palette processing in PDF renderer
  // This allows client-side palette application without API calls (Puppeteer can't send auth headers)
  const enrichedBackgroundImages = await Promise.all(
    (backgroundImages.items || []).map(async (bgImage) => {
      const filePath = bgImage.storage?.filePath || '';
      const publicUrl = bgImage.storage?.publicUrl || '';
      const isVectorLike =
        bgImage.format === 'vector' ||
        /\.svg$/i.test(filePath) ||
        /\.svg(?:\?|$)/i.test(publicUrl) ||
        /^data:image\/svg\+xml/i.test(publicUrl);

      if (isVectorLike && bgImage.storage?.filePath) {
        try {
          const rawFilePath = String(bgImage.storage.filePath).replace(/\\/g, '/').replace(/^\/+/, '');
          const withoutUploadsPrefix = rawFilePath.replace(/^uploads\//i, '');
          const withoutBgPrefix = withoutUploadsPrefix.replace(/^background-images\//i, '');
          const pathCandidates = [
            path.resolve(path.join(getUploadsSubdir('background-images'), withoutBgPrefix)),
            path.resolve(path.join(getUploadsDir(), withoutUploadsPrefix)),
            path.resolve(path.join(getUploadsDir(), rawFilePath)),
          ];
          let fullPath = null;
          for (const candidate of pathCandidates) {
            if (!isPathWithinUploads(candidate)) continue;
            try {
              await fs.access(candidate);
              fullPath = candidate;
              break;
            } catch {
              // try next candidate
            }
          }
          if (!fullPath) {
            throw new Error(`SVG file not found: ${bgImage.storage.filePath}`);
          }
          const svgContent = await fs.readFile(fullPath, 'utf-8');
          // Embed raw SVG content as base64 data URL
          const base64Svg = Buffer.from(svgContent).toString('base64');
          const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;
          return {
            ...bgImage,
            storage: {
              ...bgImage.storage,
              publicUrl: dataUrl, // Override publicUrl with embedded SVG data URL
            },
          };
        } catch (error) {
          console.warn(`[pdf-exports] Failed to load SVG for ${bgImage.id}:`, error.message);
          return bgImage;
        }
      }
      return bgImage;
    })
  );

  const themeById = Object.fromEntries((themes || []).map(t => [String(t.id), t]));
  const paletteById = Object.fromEntries((palettes || []).map(p => [String(p.id), p]));

  function getPalettePartColor(palette, partName, fallbackSlot, fallbackColor) {
    if (!palette?.colors) return fallbackColor;
    const slot = palette.parts?.[partName] || fallbackSlot;
    return palette.colors[slot] || palette.colors[fallbackSlot] || fallbackColor;
  }

  const pages = (bookData.pages || []).map(page => {
    const activeThemeId = page.themeId ?? page.background?.pageTheme ?? bookData.themeId ?? bookData.bookTheme ?? 'default';
    const theme = themeById[String(activeThemeId)];
    const themePaletteId = theme?.palette_id ?? theme?.palette;
    const effectivePaletteId = page.colorPaletteId != null
      ? page.colorPaletteId
      : (bookData.colorPaletteId ?? themePaletteId);
    const palette = effectivePaletteId ? paletteById[String(effectivePaletteId)] : null;

    if (!palette || !page.background) {
      if (!page.background && palette) {
        const pageBgColor = getPalettePartColor(palette, 'pageBackground', 'background', palette.colors?.background) ?? palette.colors?.background ?? '#ffffff';
        return { ...page, background: { type: 'color', value: pageBgColor, opacity: 1 } };
      }
      return page;
    }

    const pageBgColor = getPalettePartColor(palette, 'pageBackground', 'background', palette.colors?.background) ?? palette.colors?.background ?? '#ffffff';
    const patternForeground = getPalettePartColor(palette, 'pagePattern', 'primary', palette.colors?.primary) ?? palette.colors?.primary ?? '#666666';
    const patternBackground = getPalettePartColor(palette, 'pageBackground', 'background', palette.colors?.background) ?? palette.colors?.background ?? '#ffffff';

    let updatedBackground = page.background;
    if (page.background.type === 'color') {
      updatedBackground = { ...page.background, value: pageBgColor };
    } else if (page.background.type === 'pattern') {
      updatedBackground = {
        ...page.background,
        patternBackgroundColor: patternForeground,
        patternForegroundColor: patternBackground
      };
    }

    return { ...page, background: updatedBackground };
  });

  const result = {
    ...bookData,
    pages,
    colorPalettes: palettes,
    backgroundImages: enrichedBackgroundImages
  };
  const embeddedSvgCount = enrichedBackgroundImages.filter(
    (img) => typeof img?.storage?.publicUrl === 'string' && img.storage.publicUrl.startsWith('data:image/svg+xml;base64,')
  ).length;
  console.log('[PDF Debug] applyPaletteToBookData embedded SVG backgrounds:', {
    embeddedSvgCount,
    totalBackgroundImages: enrichedBackgroundImages.length,
  });
  const bgImagePages = pages.filter(p => p.background?.type === 'image');
  if (bgImagePages.length > 0) {
    bgImagePages.forEach((p, i) => {
      const bg = p.background;
      console.log('[PDF Debug] applyPaletteToBookData image background', {
        index: i,
        valuePrefix: bg.value?.substring?.(0, 60),
        backgroundImageId: bg.backgroundImageId,
        applyPalette: bg.applyPalette,
      });
    });
  }
  return result;
}

// Regex to match protected image URLs for replacement (relative or absolute)
const PROTECTED_IMAGE_URL_PATTERN = /\/api\/images\/file\/([0-9a-f-]{36})(?:\?.*)?$/i;
const PROTECTED_STICKER_URL_PATTERN = /\/api\/stickers\/([^/]+)\/(?:file|thumbnail|image)(?:\?.*)?$/;
const PROTECTED_BG_IMAGE_URL_PATTERN = /\/api\/background-images\/([^/]+)\/(?:file|thumbnail)(?:\?.*)?$/;
const UPLOADS_STICKERS_PATTERN = /\/uploads\/stickers\/(.+?)(?:\?|$)/;
const UPLOADS_BG_IMAGES_PATTERN = /\/uploads\/background-images\/(.+?)(?:\?|$)/;

const MIME_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function fileToDataUrl(fullPath) {
  if (!fsSync.existsSync(fullPath)) return null;
  const buf = fsSync.readFileSync(fullPath);
  const ext = path.extname(fullPath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/**
 * Replaces protected URLs with base64 data URLs in book data.
 * Handles images, stickers, and background images.
 * PDF rendering (Puppeteer) cannot send auth headers, so we resolve server-side.
 * @param {Object} bookData - Book data with pages
 * @param {number} bookId - Book ID for access check
 * @param {number} userId - User ID for access check
 * @returns {Promise<Object>} - Mutated bookData with resolved image URLs
 */
async function resolveProtectedImageUrls(bookData, bookId, userId) {
  const imageCache = new Map(); // id -> dataUrl
  const stickerCache = new Map(); // slug -> dataUrl
  const bgImageCache = new Map(); // slug -> dataUrl
  const uploadsCache = new Map(); // path -> dataUrl

  async function imageIdToDataUrl(imageId) {
    if (imageCache.has(imageId)) return imageCache.get(imageId);

    const result = await pool.query(
      `SELECT id, file_path, filename, uploaded_by, book_id FROM public.images WHERE id = $1`,
      [imageId]
    );

    if (result.rows.length === 0) return null;

    const img = result.rows[0];
    const isOwner = img.uploaded_by === userId;
    const belongsToBook = img.book_id === bookId;
    let hasBookAccess = false;
    if (img.book_id) {
      const bookCheck = await pool.query(
        `SELECT 1 FROM public.books b
         LEFT JOIN public.book_friends bf ON b.id = bf.book_id
         WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)`,
        [img.book_id, userId]
      );
      hasBookAccess = bookCheck.rows.length > 0;
    }
    // Da loadBookDataFromDB bereits Buchzugriff prüft, hat der User Zugriff auf bookId
    const hasExportBookAccess = true;
    if (!isOwner && !belongsToBook && !hasBookAccess && !hasExportBookAccess) return null;

    const fullPath = path.resolve(path.join(getUploadsDir(), img.file_path));
    if (!isPathWithinUploads(fullPath)) return null;

    const dataUrl = fileToDataUrl(fullPath);
    if (dataUrl) imageCache.set(imageId, dataUrl);
    return dataUrl;
  }

  async function stickerSlugToDataUrl(slug) {
    const decoded = decodeURIComponent(slug);
    if (stickerCache.has(decoded)) return stickerCache.get(decoded);

    const sticker = await stickersService.getSticker(decoded);
    if (!sticker || sticker.storage?.type !== 'local' || !sticker.storage?.filePath) return null;

    const relPath = sticker.storage.filePath.replace(/^\/+/, '');
    const fullPath = path.resolve(path.join(getUploadsSubdir('stickers'), relPath));
    if (!isPathWithinUploads(fullPath)) return null;

    const dataUrl = fileToDataUrl(fullPath);
    if (dataUrl) stickerCache.set(decoded, dataUrl);
    return dataUrl;
  }

  async function bgImageSlugToDataUrl(slug) {
    const decoded = decodeURIComponent(slug);
    if (bgImageCache.has(decoded)) return bgImageCache.get(decoded);

    const image = await backgroundImagesService.getBackgroundImage(decoded);
    // Background images from DB use filePath (no storage.type – treat as local)
    if (!image || !image.storage?.filePath) return null;

    const relPath = image.storage.filePath.replace(/^\/+/, '');

    const fullPath = path.resolve(path.join(getUploadsSubdir('background-images'), relPath));
    if (!isPathWithinUploads(fullPath)) return null;

    const dataUrl = fileToDataUrl(fullPath);
    if (dataUrl) bgImageCache.set(decoded, dataUrl);
    return dataUrl;
  }

  async function uploadsPathToDataUrl(subdir, relPath) {
    const cacheKey = `${subdir}/${relPath}`;
    if (uploadsCache.has(cacheKey)) return uploadsCache.get(cacheKey);

    const fullPath = path.resolve(path.join(getUploadsSubdir(subdir), relPath));
    if (!isPathWithinUploads(fullPath)) return null;

    const dataUrl = fileToDataUrl(fullPath);
    if (dataUrl) uploadsCache.set(cacheKey, dataUrl);
    return dataUrl;
  }

  async function resolveUrl(src) {
    if (!src || typeof src !== 'string') return src;
    // Already data URL
    if (src.startsWith('data:')) return src;

    let m = src.match(PROTECTED_IMAGE_URL_PATTERN);
    if (m) return imageIdToDataUrl(m[1]) || src;

    m = src.match(PROTECTED_STICKER_URL_PATTERN);
    if (m) return stickerSlugToDataUrl(m[1]) || src;

    m = src.match(PROTECTED_BG_IMAGE_URL_PATTERN);
    if (m) return bgImageSlugToDataUrl(m[1]) || src;

    m = src.match(UPLOADS_STICKERS_PATTERN);
    if (m) return uploadsPathToDataUrl('stickers', m[1]) || src;

    m = src.match(UPLOADS_BG_IMAGES_PATTERN);
    if (m) return uploadsPathToDataUrl('background-images', m[1]) || src;

    return src;
  }

  const pages = bookData.pages || [];
  for (const page of pages) {
    // Resolve element images (image, sticker)
    const elements = page.elements || [];
    for (const element of elements) {
      if (element.type === 'image' && typeof element.imageId === 'string') {
        const dataUrl = await imageIdToDataUrl(element.imageId);
        if (dataUrl) element.src = dataUrl;
        continue;
      }

      if (element.type === 'sticker' && element.src) {
        const dataUrl = await resolveUrl(element.src);
        if (dataUrl) element.src = dataUrl;
      }
    }

    // Resolve page background image
    // IMPORTANT: For images with palette application enabled, remove the value URL
    // so the client uses backgroundImageId with the embedded backgroundImages registry
    const bg = page.background;
    if (bg?.type === 'image' && bg?.backgroundImageId) {
      const shouldApplyPalette = bg.applyPalette !== false;
      
      if (shouldApplyPalette) {
        // Remove value so client uses backgroundImageId with embedded registry and applies palette
        page.background = { 
          ...bg, 
          value: undefined // Client will resolve from backgroundImageId with palette colors
        };
      } else if (bg.value) {
        // For non-palette backgrounds, resolve the URL to data URL
        const dataUrl = await resolveUrl(bg.value);
        if (dataUrl) {
          page.background = { ...bg, value: dataUrl };
        }
      }
    } else if (bg?.type === 'image' && bg?.value) {
      // Direct upload without backgroundImageId - resolve URL
      const dataUrl = await resolveUrl(bg.value);
      if (dataUrl) {
        page.background = { ...bg, value: dataUrl };
      }
    }
  }

  return bookData;
}

/**
 * Applies monochrome toning to a pixel image (JPG/PNG) using sharp.
 * Returns a base64 PNG data URL, or null on failure.
 */
async function applyMonochromeToneToPixelImageServer(fullPath, toneColorHex) {
  try {
    const { r, g, b } = hexToRgb(toneColorHex);
    const { data, info } = await sharp(fullPath).raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    for (let i = 0; i < data.length; i += channels) {
      const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      data[i]     = Math.min(255, Math.max(0, Math.round((gray * r) / 255)));
      data[i + 1] = Math.min(255, Math.max(0, Math.round((gray * g) / 255)));
      data[i + 2] = Math.min(255, Math.max(0, Math.round((gray * b) / 255)));
      // channels > 3 → alpha untouched
    }
    const tonedBuffer = await sharp(data, {
      raw: { width: info.width, height: info.height, channels },
    }).png().toBuffer();
    return `data:image/png;base64,${tonedBuffer.toString('base64')}`;
  } catch (err) {
    console.warn('[pdf-exports] applyMonochromeToneToPixelImageServer failed:', err.message);
    return null;
  }
}

function getSimpleLuminanceFromRgb(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function collectPaletteHexColorsForRamp(palette) {
  if (!palette || !palette.colors || typeof palette.colors !== 'object') return [];
  const values = Object.values(palette.colors);
  const unique = new Set();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const normalized = normalizeHexColor(ensureHexHash(value));
    if (normalized) {
      unique.add(normalized);
    }
  }
  return Array.from(unique);
}

function getBrightPaletteColorHex(palette, fallbackColor) {
  const colors = collectPaletteHexColorsForRamp(palette);
  if (colors.length === 0) {
    return normalizeHexColor(ensureHexHash(fallbackColor || '#ffffff')) || '#ffffff';
  }
  return [...colors].sort((a, b) => {
    const aRgb = hexToRgb(a);
    const bRgb = hexToRgb(b);
    return getSimpleLuminanceFromRgb(bRgb.r, bRgb.g, bRgb.b) - getSimpleLuminanceFromRgb(aRgb.r, aRgb.g, aRgb.b);
  })[0] || '#ffffff';
}

function buildPaletteRampLutServer(paletteHexColors) {
  const sorted = [...(paletteHexColors || [])]
    .map((color) => normalizeHexColor(ensureHexHash(color)))
    .filter(Boolean)
    .sort((a, b) => {
      const aRgb = hexToRgb(a);
      const bRgb = hexToRgb(b);
      return getSimpleLuminanceFromRgb(aRgb.r, aRgb.g, aRgb.b) - getSimpleLuminanceFromRgb(bRgb.r, bRgb.g, bRgb.b);
    });

  const ramp = sorted.length > 0 ? sorted : ['#000000', '#ffffff'];
  const lut = new Uint8ClampedArray(256 * 3);

  for (let i = 0; i < 256; i += 1) {
    const t = i / 255;
    const scaled = t * (ramp.length - 1);
    const leftIndex = Math.floor(scaled);
    const rightIndex = Math.min(ramp.length - 1, leftIndex + 1);
    const mix = scaled - leftIndex;

    const left = hexToRgb(ramp[leftIndex] || '#000000');
    const right = hexToRgb(ramp[rightIndex] || '#ffffff');

    lut[i * 3] = Math.round(left.r + (right.r - left.r) * mix);
    lut[i * 3 + 1] = Math.round(left.g + (right.g - left.g) * mix);
    lut[i * 3 + 2] = Math.round(left.b + (right.b - left.b) * mix);
  }

  return lut;
}

async function applyPaletteRampToPixelImageServer(fullPath, paletteHexColors) {
  try {
    const lut = buildPaletteRampLutServer(paletteHexColors);
    const { data, info } = await sharp(fullPath).raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;

    for (let i = 0; i < data.length; i += channels) {
      const gray = Math.round(getSimpleLuminanceFromRgb(data[i], data[i + 1], data[i + 2]));
      data[i] = lut[gray * 3];
      data[i + 1] = lut[gray * 3 + 1];
      data[i + 2] = lut[gray * 3 + 2];
      // channels > 3 -> alpha untouched
    }

    const tonedBuffer = await sharp(data, {
      raw: { width: info.width, height: info.height, channels },
    }).png().toBuffer();

    return `data:image/png;base64,${tonedBuffer.toString('base64')}`;
  } catch (err) {
    console.warn('[pdf-exports] applyPaletteRampToPixelImageServer failed:', err.message);
    return null;
  }
}

/**
 * Applies server-side monochrome toning to pixel (non-SVG) background images
 * that have applyPalette !== false.  Runs after applyPaletteToBookData so that
 * bookData.colorPalettes and bookData.backgroundImages are already populated.
 */
async function applyPixelImagePaletteToBookData(bookData) {
  if (!Array.isArray(bookData.pages)) return bookData;

  const paletteById = Object.fromEntries(
    (Array.isArray(bookData.colorPalettes) ? bookData.colorPalettes : [])
      .map((p) => [String(p.id), p])
  );

  const bgImagesById = {};
  for (const img of (Array.isArray(bookData.backgroundImages) ? bookData.backgroundImages : [])) {
    if (img?.id != null) {
      bgImagesById[String(img.id)] = img;
    }
    if (img?.slug) {
      bgImagesById[String(img.slug)] = img;
    }
  }

  function palettePart(palette, partName, fallbackSlot, fallbackColor) {
    if (!palette || !palette.colors) return fallbackColor;
    const slot = (palette.parts && palette.parts[partName]) || fallbackSlot;
    return palette.colors[slot] || palette.colors[fallbackSlot] || fallbackColor;
  }

  function getPagePalette(page) {
    const paletteId = page?.colorPaletteId ?? bookData.colorPaletteId ?? null;
    if (paletteId == null) return null;
    return paletteById[String(paletteId)] || null;
  }

  function getPageToneColor(page, bg) {
    const palette = getPagePalette(page);
    const fallback = (bg.backgroundColorEnabled && bg.backgroundColor)
      ? bg.backgroundColor
      : '#ffffff';
    return getBrightPaletteColorHex(palette, fallback);
  }

  const pages = await Promise.all(
    bookData.pages.map(async (page) => {
      const bg = page.background;
      if (!bg || bg.type !== 'image') return page;
      if (bg.applyPalette === false) return page;
      const paletteMode = bg.paletteMode ?? 'monochrome';
      if (paletteMode !== 'monochrome' && paletteMode !== 'palette-ramp') return page;

      const bgId = bg.backgroundImageId ? String(bg.backgroundImageId) : null;
      if (!bgId) return page;

      let entry = bgImagesById[bgId];
      if (!entry) {
        try {
          entry = await backgroundImagesService.getBackgroundImage(bgId);
          if (entry?.id != null) {
            bgImagesById[String(entry.id)] = entry;
          }
          if (entry?.slug) {
            bgImagesById[String(entry.slug)] = entry;
          }
        } catch {
          entry = null;
        }
      }
      if (!entry) return page;

      // Skip SVG/vector — those are handled by the client renderer via embedded SVG + palette
      const isSvg =
        (entry.storage?.publicUrl?.startsWith('data:image/svg+xml')) ||
        entry.format === 'vector' ||
        /\.svg$/i.test(entry.storage?.filePath || '') ||
        /\.svg$/i.test(entry.storage?.publicUrl || '');
      if (isSvg) return page;

      // Resolve absolute file path (same strategy as applyPaletteToBookData)
      const rawFilePath = String(entry.storage?.filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
      if (!rawFilePath) return page;
      const withoutUploads = rawFilePath.replace(/^uploads\//i, '');
      const withoutBg = withoutUploads.replace(/^background-images\//i, '');
      const candidates = [
        path.resolve(path.join(getUploadsSubdir('background-images'), withoutBg)),
        path.resolve(path.join(getUploadsDir(), withoutUploads)),
        path.resolve(path.join(getUploadsDir(), rawFilePath)),
      ];
      let fullPath = null;
      for (const candidate of candidates) {
        if (!isPathWithinUploads(candidate)) continue;
        try { await fs.access(candidate); fullPath = candidate; break; } catch { /* try next */ }
      }
      if (!fullPath) return page;

      const palette = getPagePalette(page);
      const toneColor = getPageToneColor(page, bg);
      const tonedDataUrl = paletteMode === 'palette-ramp'
        ? await applyPaletteRampToPixelImageServer(fullPath, collectPaletteHexColorsForRamp(palette))
        : await applyMonochromeToneToPixelImageServer(fullPath, toneColor);
      if (!tonedDataUrl) return page;

      // Force renderer to use pre-toned value instead of template/backgroundImageId resolution
      return {
        ...page,
        background: {
          ...bg,
          value: tonedDataUrl,
          applyPalette: false,
          // Keep designer overlay palette intent independent from base-image pre-toning.
          designerApplyPalette: bg.applyPalette !== false,
          backgroundImageId: undefined,
        },
      };
    })
  );

  return { ...bookData, pages };
}

async function enrichDesignerCanvasForLiveDesignerExport(bookData, exportOptions = {}) {
  // Always enrich designer canvas assets for PDF export to avoid runtime fetch failures
  // (e.g. origin-protected asset endpoints in headless rendering).
  if (!Array.isArray(bookData.pages)) {
    return bookData;
  }

  const paletteById = Object.fromEntries(
    (Array.isArray(bookData.colorPalettes) ? bookData.colorPalettes : [])
      .map((palette) => [String(palette.id), palette])
  );

  const getPalettePartColor = (palette, partName, fallbackSlot, fallbackColor) => {
    if (!palette || !palette.colors) return fallbackColor;
    const slot = (palette.parts && palette.parts[partName]) || fallbackSlot;
    return palette.colors[slot] || palette.colors[fallbackSlot] || fallbackColor;
  };

  const getPagePalette = (page) => {
    const paletteId = page?.colorPaletteId ?? bookData.colorPaletteId ?? null;
    if (paletteId == null) return null;
    return paletteById[String(paletteId)] || null;
  };

  const designerCache = new Map();
  const pages = await Promise.all(
    bookData.pages.map(async (page) => {
      const background = page?.background;
      if (background?.type !== 'image') {
        return page;
      }

      let sourceStructure = background?.designerCanvas?.structure || null;
      let sourceCanvasWidth = background?.designerCanvas?.canvasWidth;
      let sourceCanvasHeight = background?.designerCanvas?.canvasHeight;

      if (background.backgroundImageId) {
        const key = String(background.backgroundImageId);
        if (!designerCache.has(key)) {
          const designerImage = await backgroundImageDesignerService.getDesignerImageByIdentifier(key);
          designerCache.set(key, designerImage || null);
        }

        const designerImage = designerCache.get(key);
        if (designerImage?.canvas?.structure) {
          sourceStructure = designerImage.canvas.structure;
          sourceCanvasWidth = designerImage.canvas.canvasWidth;
          sourceCanvasHeight = designerImage.canvas.canvasHeight;
        }
      }

      if (!sourceStructure || !Array.isArray(sourceStructure.items)) {
        return page;
      }

      const palette = getPagePalette(page);
      const pageBackgroundColor =
        getPalettePartColor(palette, 'pageBackground', 'background', palette?.colors?.background) ||
        palette?.colors?.background ||
        '#ffffff';
      const paletteOptions = {
        applyPalette: background.applyPalette !== false,
        paletteMode: background.paletteMode || 'monochrome',
        // Designer asset tint should follow palette, not the user-selected base layer color.
        toneColor: pageBackgroundColor,
        pageBackgroundColor,
      };

      const rawStructure = sourceStructure;
      let inlinedAssetCount = 0;
      let unresolvedAssetCount = 0;
      const structure = {
        ...rawStructure,
        items: Array.isArray(rawStructure.items)
          ? await Promise.all(rawStructure.items.map(async (item) => {
              if (item?.type !== 'image') {
                return item;
              }

              if (!item.assetId || typeof item.assetId !== 'string') {
                unresolvedAssetCount += 1;
                return item;
              }

              const dataUrl = await designerAssetIdToDataUrlWithPalette(item.assetId, paletteOptions);
              if (dataUrl) {
                inlinedAssetCount += 1;
              } else {
                unresolvedAssetCount += 1;
              }
              return {
                ...item,
                // Keep live rendering branch, but avoid protected endpoint fetches (403)
                // by embedding local asset files directly.
                resolvedSrc: dataUrl || getDesignerAssetUrlById(item.assetId),
              };
            }))
          : [],
      };

      if (inlinedAssetCount > 0 || unresolvedAssetCount > 0) {
        console.log('[PDF Debug] enrichDesignerCanvasForLiveDesignerExport assets', {
          pageNumber: page?.pageNumber,
          inlinedAssetCount,
          unresolvedAssetCount,
          hasBackgroundImageId: Boolean(background.backgroundImageId),
        });
      }

      return {
        ...page,
        background: {
          ...background,
          backgroundImageType: 'designer',
          designerCanvas: {
            structure,
            canvasWidth: sourceCanvasWidth,
            canvasHeight: sourceCanvasHeight,
          },
        },
      };
    })
  );

  return {
    ...bookData,
    pages,
  };
}

const designerAssetRowCache = new Map();

function getDesignerAssetUrlById(assetId) {
  if (!assetId || typeof assetId !== 'string') {
    return null;
  }
  return `/api/background-images/designer/assets/${encodeURIComponent(assetId)}`;
}

async function getDesignerAssetRowById(assetId) {
  if (!assetId || typeof assetId !== 'string') {
    return null;
  }

  if (designerAssetRowCache.has(assetId)) {
    return designerAssetRowCache.get(assetId);
  }

  const result = await pool.query(
    `SELECT id, file_path FROM background_image_designer_image_assets WHERE id = $1 LIMIT 1`,
    [assetId],
  );
  const row = result.rows.length ? result.rows[0] : null;
  designerAssetRowCache.set(assetId, row);
  return row;
}

async function resolveDesignerAssetAbsolutePathById(assetId) {
  const assetRow = await getDesignerAssetRowById(assetId);
  if (!assetRow?.file_path) {
    return null;
  }

  const relativePath = String(assetRow.file_path).replace(/^\/+/, '');
  const fullPath = path.resolve(path.join(getUploadsSubdir('background-images'), relativePath));
  if (!isPathWithinUploads(fullPath)) {
    return null;
  }
  return fullPath;
}

async function designerAssetIdToDataUrl(assetId) {
  const fullPath = await resolveDesignerAssetAbsolutePathById(assetId);
  if (!fullPath) {
    return null;
  }

  return fileToDataUrl(fullPath);
}

function normalizeHexColor(value) {
  if (!value || typeof value !== 'string' || !value.startsWith('#')) {
    return null;
  }
  const hex = value.slice(1);
  if (hex.length === 3) {
    return `#${hex.split('').map((char) => char + char).join('').toLowerCase()}`;
  }
  if (hex.length === 6 || hex.length === 8) {
    return `#${hex.slice(0, 6).toLowerCase()}`;
  }
  return null;
}

function ensureHexHash(color) {
  if (!color || typeof color !== 'string') {
    return '#ffffff';
  }
  const trimmed = color.trim();
  if (!trimmed) {
    return '#ffffff';
  }
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function hexToRgb(hexColor) {
  const normalized = normalizeHexColor(hexColor);
  const hex = normalized ? normalized.slice(1) : '000000';
  const bigint = parseInt(hex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function getRelativeLuminance(hexColor) {
  const { r, g, b } = hexToRgb(hexColor);
  const convert = (channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const R = convert(r);
  const G = convert(g);
  const B = convert(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function hexToHsl(hexColor) {
  const { r, g, b } = hexToRgb(hexColor);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function rgbToHex(r, g, b) {
  const clamp = (c) => Math.min(255, Math.max(0, Math.round(c)));
  return (
    '#' +
    [r, g, b]
      .map((channel) => clamp(channel).toString(16).padStart(2, '0'))
      .join('')
  ).toLowerCase();
}

function hslToHex(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  let r;
  let g;
  let b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

function escapeForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractHexColorOccurrences(svgContent) {
  const regex = /#([0-9a-fA-F]{3,8})\b/g;
  const occurrences = new Map();
  let match;
  while ((match = regex.exec(svgContent)) !== null) {
    const original = match[0];
    const normalized = normalizeHexColor(original);
    if (!normalized) continue;
    if (!occurrences.has(normalized)) {
      occurrences.set(normalized, new Set());
    }
    occurrences.get(normalized).add(original);
  }
  return occurrences;
}

function extractRgbColorOccurrences(svgContent) {
  const regex = /rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})(?:\s*,\s*(0|0?\.\d+|1(?:\.0+)?))?\s*\)/gi;
  const occurrences = new Map();
  let match;
  while ((match = regex.exec(svgContent)) !== null) {
    const original = match[0];
    const r = Number(match[1]);
    const g = Number(match[2]);
    const b = Number(match[3]);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) continue;
    const normalized = rgbToHex(r, g, b);
    if (!occurrences.has(normalized)) {
      occurrences.set(normalized, new Set());
    }
    occurrences.get(normalized).add(original);
  }
  return occurrences;
}

function extractGradientStopColors(svgContent) {
  const occurrences = new Map();
  const stopColorRegex = /stop-color:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g;
  const stopColorAttrRegex = /stop-color\s*=\s*["']([^"']+)["']/gi;
  const addColor = (original) => {
    let normalized = null;
    if (original.startsWith('#')) {
      normalized = normalizeHexColor(original);
    } else if (original.startsWith('rgb')) {
      const rgbMatch = original.match(/rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})/);
      if (rgbMatch) {
        normalized = rgbToHex(Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3]));
      }
    }
    if (!normalized) return;
    if (!occurrences.has(normalized)) {
      occurrences.set(normalized, new Set());
    }
    occurrences.get(normalized).add(original);
  };

  let match;
  while ((match = stopColorRegex.exec(svgContent)) !== null) {
    addColor(match[1]);
  }
  while ((match = stopColorAttrRegex.exec(svgContent)) !== null) {
    addColor(match[1]);
  }
  return occurrences;
}

function mergeColorOccurrences(maps) {
  const merged = new Map();
  maps.forEach((map) => {
    map.forEach((originals, normalized) => {
      if (!merged.has(normalized)) {
        merged.set(normalized, new Set());
      }
      const target = merged.get(normalized);
      originals.forEach((value) => target.add(value));
    });
  });
  return merged;
}

function sortColorsByDominanceAndLuminance(colorOccurrences) {
  return Array.from(colorOccurrences.entries())
    .map(([color, originals]) => ({ color, count: originals.size, luminance: getRelativeLuminance(color) }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.luminance - a.luminance;
    })
    .map((item) => item.color);
}

function replaceCurrentColor(svgContent, replacementColor) {
  return svgContent
    .replace(/\bfill\s*=\s*["']currentColor["']/gi, `fill="${replacementColor}"`)
    .replace(/\bstroke\s*=\s*["']currentColor["']/gi, `stroke="${replacementColor}"`)
    .replace(/\bfill:\s*currentColor\b/gi, `fill:${replacementColor}`)
    .replace(/\bstroke:\s*currentColor\b/gi, `stroke:${replacementColor}`);
}

function stripSvgEditorMetadata(svg) {
  return svg
    .replace(/<sodipodi:namedview[\s\S]*?<\/sodipodi:namedview>/gi, '')
    .replace(/<inkscape:page[^>]*\/>/gi, '')
    .replace(/<inkscape:page[\s\S]*?<\/inkscape:page>/gi, '')
    .replace(/<bx:export[\s\S]*?<\/bx:export>/gi, '')
    .replace(/<bx:file[^>]*\/>/gi, '')
    .replace(/\s*sodipodi:docname="[^"]*"/gi, '');
}

function svgStringToDataUrl(svgContent) {
  const stripped = stripSvgEditorMetadata(svgContent);
  const cleaned = stripped.replace(/\s+/g, ' ').trim();
  return `data:image/svg+xml;base64,${Buffer.from(cleaned, 'utf-8').toString('base64')}`;
}

function svgDataUrlToString(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !/^data:image\/svg\+xml/i.test(dataUrl)) {
    return null;
  }

  const base64Match = dataUrl.match(/^data:image\/svg\+xml(?:;charset=[^;,]+)?;base64,(.+)$/i);
  if (base64Match && base64Match[1]) {
    try {
      return Buffer.from(base64Match[1], 'base64').toString('utf-8');
    } catch {
      return null;
    }
  }

  const plainMatch = dataUrl.match(/^data:image\/svg\+xml(?:;charset=[^;,]+)?,(.+)$/i);
  if (plainMatch && plainMatch[1]) {
    try {
      return decodeURIComponent(plainMatch[1]);
    } catch {
      return null;
    }
  }

  return null;
}

function applyMonochromeToneToSvgServer(svgContent, targetColor, options = {}) {
  if (!svgContent || !targetColor) {
    return svgStringToDataUrl(svgContent || '');
  }

  const normalizedTarget = ensureHexHash(targetColor);
  const normalizedEdgeBg = options.edgeBackgroundColor ? ensureHexHash(options.edgeBackgroundColor) : undefined;
  const targetHsl = hexToHsl(normalizedTarget);
  const colorOccurrences = mergeColorOccurrences([
    extractHexColorOccurrences(svgContent),
    extractRgbColorOccurrences(svgContent),
    extractGradientStopColors(svgContent),
  ]);

  let processed = replaceCurrentColor(svgContent, normalizedTarget);
  const edgeColorToReplace =
    normalizedEdgeBg && colorOccurrences.size > 0
      ? sortColorsByDominanceAndLuminance(colorOccurrences)[0]
      : undefined;
  const invertBrightness =
    typeof options.pageBackgroundColor === 'string' &&
    options.pageBackgroundColor.startsWith('#') &&
    getRelativeLuminance(options.pageBackgroundColor) <= 0.15;

  colorOccurrences.forEach((originals, normalizedColor) => {
    let replacement;
    if (
      edgeColorToReplace &&
      normalizedColor === edgeColorToReplace &&
      getRelativeLuminance(normalizedColor) >= 0.15
    ) {
      replacement = normalizedEdgeBg;
    } else {
      const origHsl = hexToHsl(normalizedColor);
      const lightness = invertBrightness ? 100 - origHsl.l : origHsl.l;
      replacement = hslToHex(targetHsl.h, targetHsl.s, lightness);
    }
    if (!replacement || !/^#[0-9a-fA-F]{6}$/.test(replacement)) {
      return;
    }

    originals.forEach((originalColor) => {
      const pattern = new RegExp(escapeForRegex(originalColor), 'gi');
      processed = processed.replace(pattern, replacement);
    });
  });

  return svgStringToDataUrl(processed);
}

async function designerAssetIdToDataUrlWithPalette(assetId, paletteOptions = {}) {
  const fullPath = await resolveDesignerAssetAbsolutePathById(assetId);
  if (!fullPath) {
    return null;
  }

  const ext = path.extname(fullPath).toLowerCase();
  if (ext !== '.svg') {
    return fileToDataUrl(fullPath);
  }

  const svgContent = await fs.readFile(fullPath, 'utf-8');
  const shouldApplyPalette = paletteOptions.applyPalette !== false;
  if (!shouldApplyPalette) {
    return svgStringToDataUrl(svgContent);
  }

  if (paletteOptions.paletteMode && paletteOptions.paletteMode !== 'monochrome') {
    return svgStringToDataUrl(svgContent);
  }

  const targetColor =
    paletteOptions.backgroundColorOverride ||
    paletteOptions.toneColor ||
    '#ffffff';
  return applyMonochromeToneToSvgServer(svgContent, targetColor, {
    edgeBackgroundColor: paletteOptions.backgroundColorOverride,
    pageBackgroundColor: paletteOptions.pageBackgroundColor,
  });
}

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toAbsolutePosition(value, canvasSize) {
  const numeric = toFiniteNumber(value, 0);
  if (numeric >= 0 && numeric <= 1) {
    return numeric * canvasSize;
  }
  return numeric;
}

function mapDesignerCanvasToRenderableElements(canvasStructure, targetWidth, targetHeight) {
  const items = Array.isArray(canvasStructure?.items) ? canvasStructure.items : [];

  return items
    .map((item, index) => {
      const x = toAbsolutePosition(item?.x, targetWidth);
      const y = toAbsolutePosition(item?.y, targetHeight);
      const width = toFiniteNumber(item?.width, 100);
      const height = toFiniteNumber(item?.height, 100);
      const rawRotation = toFiniteNumber(item?.rotation, 0);
      const rotation = Math.abs(rawRotation) < 0.01 ? 0 : rawRotation;
      const opacity = Math.max(0, Math.min(1, toFiniteNumber(item?.opacity, 1)));

      if (item?.type === 'image') {
        const normalizedSrc = item.resolvedSrc || getDesignerAssetUrlById(item.assetId);
        if (!normalizedSrc) {
          return null;
        }
        return {
          id: item.id || `designer-image-${index}`,
          type: 'image',
          x,
          y,
          width,
          height,
          rotation,
          opacity,
          src: normalizedSrc,
          url: normalizedSrc,
          scaleX: 1,
          scaleY: 1,
          designerBackgroundAsset: true,
          imageClipPosition: 'top-left',
        };
      }

      if (item?.type === 'text') {
        return {
          id: item.id || `designer-text-${index}`,
          type: 'text',
          x,
          y,
          width,
          height,
          rotation,
          opacity,
          text: item.text || '',
          fontFamily: item.fontFamily || 'Arial, sans-serif',
          fontSize: Math.max(1, toFiniteNumber(item.fontSize, 48)),
          fontBold: Boolean(item.fontBold),
          fontItalic: Boolean(item.fontItalic),
          fontColor: item.fontColor || '#000000',
          fontOpacity: Math.max(0, Math.min(1, toFiniteNumber(item.fontOpacity, 1))),
          align: item.textAlign || 'left',
          textAlign: item.textAlign || 'left',
          scaleX: 1,
          scaleY: 1,
        };
      }

      if (item?.type === 'sticker') {
        const stickerSrc = `/api/stickers/${encodeURIComponent(item.stickerId)}/file`;
        return {
          id: item.id || `designer-sticker-${index}`,
          type: 'sticker',
          x,
          y,
          width,
          height,
          rotation,
          opacity,
          src: stickerSrc,
          url: stickerSrc,
          scaleX: 1,
          scaleY: 1,
        };
      }

      return null;
    })
    .filter((item) => item !== null);
}

// Parse schema from DATABASE_URL
const url = new URL(process.env.DATABASE_URL);
const schema = url.searchParams.get('schema') || 'public';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Set search path from DATABASE_URL schema parameter
pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}`);
});

const parseJsonField = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
};

// Helper function to safely convert error to string for database storage
function safeErrorString(error) {
  if (!error) return 'Unknown error';
  
  // If error.message exists and is a string, use it
  if (error.message && typeof error.message === 'string') {
    // Remove null bytes and other invalid UTF-8 characters
    return error.message.replace(/\0/g, '').substring(0, 1000); // Limit length and remove null bytes
  }
  
  // If error is a string, use it
  if (typeof error === 'string') {
    return error.replace(/\0/g, '').substring(0, 1000);
  }
  
  // Fallback: convert to string and clean
  try {
    return String(error).replace(/\0/g, '').substring(0, 1000);
  } catch (e) {
    return 'Error occurred (could not convert to string)';
  }
}

// Erstelle Queue-Instanz mit konfigurierbaren Limits
const exportQueue = new PDFExportQueue({
  maxConcurrentExports: parseInt(process.env.MAX_CONCURRENT_PDF_EXPORTS || '2'), // 2-3 je nach RAM
  maxQueueSize: 50,
  rateLimitPerUser: 3, // Max 3 gleichzeitige Exports pro User
  rateLimitWindow: 60 * 1000 // 1 Minute
});

// Export-Prozessor Funktion
async function processExport(job) {
  const { exportId, bookId, userId, options, io } = job;
  
  // Update status to processing
  await pool.query(
    'UPDATE public.pdf_exports SET status = $1 WHERE id = $2',
    ['processing', exportId]
  );

  // Load complete book data from database
  const bookData = await loadBookDataFromDB(bookId, userId);

  if (!bookData) {
    throw new Error('Failed to load book data');
  }

  // Replace protected image URLs with base64 data URLs (Puppeteer cannot send auth headers)
  await resolveProtectedImageUrls(bookData, bookId, userId);

  // Apply palette to backgrounds and embed colorPalettes (no client fetch, avoids 403 in Puppeteer)
  const bookDataWithPalette = await applyPaletteToBookData(bookData);

  // Apply monochrome toning to non-SVG pixel background images server-side
  const bookDataWithPixelTone = await applyPixelImagePaletteToBookData(bookDataWithPalette);

  // For excellent/printing quality, render designer backgrounds live from canvas payload.
  const bookDataForRender = await enrichDesignerCanvasForLiveDesignerExport(bookDataWithPixelTone, options);

  // Generate PDF
  const pdfPath = await generatePDFFromBook(
    bookDataForRender,
    options,
    exportId,
    (progress) => {
      // Optional: Update progress in DB
      // Could emit progress via Socket.IO here
      if (io) {
        io.to(`user_${userId}`).emit('pdf_export_progress', {
          exportId,
          progress: Math.round(progress)
        });
      }
    }
  );

  // Get file size
  const stats = await fs.stat(pdfPath);
  const fileSize = stats.size;

  // Update export record
  await pool.query(
    `UPDATE public.pdf_exports 
     SET status = $1, file_path = $2, file_size = $3, completed_at = CURRENT_TIMESTAMP 
     WHERE id = $4`,
    ['completed', pdfPath, fileSize, exportId]
  );

  // Get book name for notification
  const bookResult = await pool.query('SELECT name FROM public.books WHERE id = $1', [bookId]);
  const bookName = bookResult.rows[0]?.name || 'Book';

  // Send Socket.IO notification
  if (io) {
    io.to(`user_${userId}`).emit('pdf_export_completed', {
      exportId,
      bookId,
      bookName,
      status: 'completed'
    });
  }

  return { exportId, pdfPath, fileSize };
}

async function loadBookDataFromDB(bookId, userId) {
  // Check if user has access
  const bookAccess = await pool.query(`
    SELECT b.* FROM public.books b
    LEFT JOIN public.book_friends bf ON b.id = bf.book_id
    WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)
  `, [bookId, userId]);

  if (bookAccess.rows.length === 0) {
    return null;
  }

  const book = bookAccess.rows[0];
  const specialPagesConfig = parseJsonField(book.special_pages_config) || null;

  // Get pages
  const pagesResult = await pool.query(
    'SELECT * FROM public.pages WHERE book_id = $1 ORDER BY page_number ASC',
    [bookId]
  );

  // Get answers
  const answersResult = await pool.query(`
    SELECT a.* FROM public.answers a
    JOIN public.questions q ON a.question_id = q.id
    WHERE q.book_id = $1
  `, [bookId]);

  // Get questions
  const questionsResult = await pool.query(
    'SELECT * FROM public.questions WHERE book_id = $1 ORDER BY display_order ASC NULLS LAST, created_at ASC',
    [bookId]
  );

  // Get page assignments
  const assignmentsResult = await pool.query(`
    SELECT pa.page_id, pa.user_id, p.page_number, u.name, u.email, u.role
    FROM public.page_assignments pa
    JOIN public.pages p ON pa.page_id = p.id
    JOIN public.users u ON pa.user_id = u.id
    WHERE p.book_id = $1
  `, [bookId]);

  // Build book data structure similar to API response
  return {
    id: book.id,
    name: book.name,
    pageSize: book.page_size,
    orientation: book.orientation,
    bookTheme: book.theme_id, // Use theme_id (book_theme was deprecated)
    themeId: book.theme_id,
    colorPaletteId: book.color_palette_id,
    pages: pagesResult.rows.map(page => {
      let pageData = {};
      if (page.elements) {
        if (typeof page.elements === 'object' && !Array.isArray(page.elements)) {
          pageData = page.elements;
        } else if (typeof page.elements === 'string') {
          try {
            pageData = JSON.parse(page.elements);
          } catch (e) {
            pageData = {};
          }
        } else {
          pageData = { elements: Array.isArray(page.elements) ? page.elements : [] };
        }
      }
      const elements = pageData.elements || [];
      
      // Debug: Log all elements to check if fillOpacity is present, especially QnA elements
      // elements.forEach((element, index) => {
      //   if (element.textType === 'qna' || element.type === 'rect') {
      //     console.log(`[DEBUG pdf-exports] Element ${index} from DB:`, {
      //       id: element.id,
      //       type: element.type,
      //       textType: element.textType,
      //       hasFillOpacity: 'fillOpacity' in element,
      //       fillOpacity: element.fillOpacity,
      //       hasBackgroundOpacity: 'backgroundOpacity' in element,
      //       backgroundOpacity: element.backgroundOpacity,
      //       hasBackground: 'background' in element,
      //       background: element.background ? {
      //         hasFillOpacity: 'fillOpacity' in (element.background || {}),
      //         fillOpacity: element.background?.fillOpacity,
      //         hasOpacity: 'opacity' in (element.background || {}),
      //         opacity: element.background?.opacity,
      //         hasBackgroundOpacity: 'backgroundOpacity' in (element.background || {}),
      //         backgroundOpacity: element.background?.backgroundOpacity
      //       } : undefined
      //     });
      //   }
      // });
      
      // Update answer elements with actual answer text
      const updatedElements = elements.map(element => {
        if (element.textType === 'answer') {
          const pageAssignment = assignmentsResult.rows.find(pa => pa.page_id === page.id);
          if (pageAssignment) {
            let questionId = element.questionId;
            if (!questionId) {
              const questionElement = elements.find(el => el.textType === 'question' && el.questionId);
              if (questionElement) {
                questionId = questionElement.questionId;
              }
            }

            if (questionId) {
              const assignedUserAnswer = answersResult.rows.find(a =>
                a.question_id === questionId && a.user_id === pageAssignment.user_id
              );
              if (assignedUserAnswer) {
                return {
                  ...element,
                  questionId: questionId,
                  text: assignedUserAnswer.answer_text || '',
                  answerId: assignedUserAnswer.id
                };
              }
            }
          }
        }

        // Update QnA elements with actual answer text
        if (element.textType === 'qna' && element.questionId) {
          const pageAssignment = assignmentsResult.rows.find(pa => pa.page_id === page.id);
          if (pageAssignment) {
            const assignedUserAnswer = answersResult.rows.find(a =>
              a.question_id === element.questionId && a.user_id === pageAssignment.user_id
            );
            if (assignedUserAnswer) {
              // For QnA elements, store the answer in a special field that renderQnA can use
              return {
                ...element,
                answerText: assignedUserAnswer.answer_text || '',
                formattedAnswerText: assignedUserAnswer.formatted_text || assignedUserAnswer.answer_text || '',
                answerId: assignedUserAnswer.id
              };
            }
          }
        }

        // Update QnA2 elements with actual answer text (same as qna - for PDF renderer getDisplaySegments)
        if (element.textType === 'qna2' && element.questionId) {
          const pageAssignment = assignmentsResult.rows.find(pa => pa.page_id === page.id);
          if (pageAssignment) {
            const assignedUserAnswer = answersResult.rows.find(a =>
              a.question_id === element.questionId && a.user_id === pageAssignment.user_id
            );
            if (assignedUserAnswer) {
              const answerText = assignedUserAnswer.formatted_text || assignedUserAnswer.answer_text || '';
              return {
                ...element,
                answerText,
                answerId: assignedUserAnswer.id
              };
            }
          }
        }

        return element;
      });

      const layoutVariation = pageData.layoutVariation ?? page.layout_variation ?? 'normal';
      const pageResult = {
        id: page.id,
        pageNumber: page.page_number,
        elements: updatedElements,
        background: {
          ...pageData.background,
          pageTheme: page.theme_id || null
        },
        layoutId: formatLayoutIdForResponse(page.layout_id, layoutVariation),
        ...(page.theme_id ? { themeId: page.theme_id } : {}),
        colorPaletteId: page.color_palette_id,
        pageType: page.page_type || 'content'
      };
      
      // Debug logging
      
      return pageResult;
    }),
    questions: questionsResult.rows,
    answers: answersResult.rows,
    pageAssignments: assignmentsResult.rows
  };
}

/**
 * Validate all assets in book data are accessible before export.
 * Checks: image IDs, stickers, background images.
 * Early fail if any asset is missing or inaccessible.
 */
async function validateExportAssets(bookData, userId, isAdmin = false) {
  const checkedImageIds = new Set();
  const checkedStickerSlugs = new Set();
  const checkedBgImageIds = new Set();
  const checkedDesignerAssetIds = new Set();

  // Check all element images and stickers across all pages
  for (const page of bookData.pages || []) {
    const pageInfo = `page_number=${page.page_number}, page_id=${page.id}`;
    
    for (const element of page.elements || []) {
      if (element.type === 'image' && element.imageId && !checkedImageIds.has(element.imageId)) {
        checkedImageIds.add(element.imageId);
        const imgResult = await pool.query(
          'SELECT id FROM public.images WHERE id = $1',
          [element.imageId]
        );
        if (imgResult.rows.length === 0) {
          const errorMsg = isAdmin 
            ? `Image asset not found: ${element.imageId} (${pageInfo})` 
            : 'Image asset not found on one of your pages';
          throw new Error(errorMsg);
        }
      }

      if (element.type === 'sticker' && element.src && !checkedStickerSlugs.has(element.src)) {
        checkedStickerSlugs.add(element.src);
        const stickerSlug = element.src.match(/\/api\/stickers\/([^/]+)\//)?.[1];
        if (stickerSlug) {
          const stickerResult = await stickersService.getSticker(decodeURIComponent(stickerSlug));
          if (!stickerResult) {
            const errorMsg = isAdmin 
              ? `Sticker asset not found: ${stickerSlug} (${pageInfo})` 
              : 'Sticker asset not found on one of your pages';
            throw new Error(errorMsg);
          }
        }
      }
    }

    // Check page background image
    if (page.background?.type === 'image' && page.background?.backgroundImageId && !checkedBgImageIds.has(page.background.backgroundImageId)) {
      checkedBgImageIds.add(page.background.backgroundImageId);
      const bgResult = await backgroundImagesService.getBackgroundImage(page.background.backgroundImageId);
      if (!bgResult) {
        const errorMsg = isAdmin 
          ? `Background image not found: ${page.background.backgroundImageId} (${pageInfo})` 
          : 'Background image not found on one of your pages';
        throw new Error(errorMsg);
      }
    }

    // Check designer canvas assets if present
    const designerPayload = extractDesignerCanvasPayload(page.background);
    if (designerPayload?.structure?.items) {
      for (const item of designerPayload.structure.items) {
        if (item.type === 'image') {
          const assetId = typeof item.assetId === 'string' ? item.assetId : '';
          if (!assetId) {
            const errorMsg = isAdmin
              ? `Designer image assetId missing (${pageInfo})`
              : 'Designer image asset missing on one of your pages';
            throw new Error(errorMsg);
          }
          if (!checkedDesignerAssetIds.has(assetId)) {
            checkedDesignerAssetIds.add(assetId);
            const assetResult = await backgroundImageDesignerService.getDesignerImageAsset(assetId);
            if (!assetResult) {
              const errorMsg = isAdmin
                ? `Designer image asset not found: ${assetId} (${pageInfo})`
                : 'Designer image asset not found on one of your pages';
              throw new Error(errorMsg);
            }
          }
        }

        if (item.type === 'sticker' && item.stickerId && !checkedStickerSlugs.has(item.stickerId)) {
          checkedStickerSlugs.add(item.stickerId);
          const stickerResult = await stickersService.getSticker(item.stickerId);
          if (!stickerResult) {
            const errorMsg = isAdmin 
              ? `Designer sticker asset not found: ${item.stickerId} (${pageInfo})` 
              : 'Designer sticker asset not found on one of your pages';
            throw new Error(errorMsg);
          }
        }
      }
    }
  }

  console.log('[PDF Export] Asset validation passed:', {
    imageCount: checkedImageIds.size,
    stickerCount: checkedStickerSlugs.size,
    backgroundImageCount: checkedBgImageIds.size,
    designerImageAssetCount: checkedDesignerAssetIds.size,
  });
}

// Helper to extract designer canvas payload (same logic as used in enrichment)
function extractDesignerCanvasPayload(background) {
  if (typeof background !== 'object' || background === null) {
    return null;
  }
  
  if (background.designerCanvas && typeof background.designerCanvas === 'object') {
    return background.designerCanvas;
  }
  
  return null;
}

// Create new PDF export
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { bookId, quality, pageRange, startPage, endPage, currentPageIndex, currentPageNumber, useCMYK, iccProfile } = req.body;
    const userId = req.user.id;

    // Validate book access
    const bookAccess = await pool.query(`
      SELECT b.* FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check user role for quality restrictions
    const book = bookAccess.rows[0];
    const isOwner = book.owner_id === userId;
    const isAdmin = req.user.role === 'admin';
    
    let bookRole = 'publisher';
    if (!isOwner) {
      const collaborator = await pool.query(
        'SELECT book_role FROM public.book_friends WHERE book_id = $1 AND user_id = $2',
        [bookId, userId]
      );
      if (collaborator.rows.length > 0) {
        bookRole = collaborator.rows[0].book_role;
      }
    }

    // Check quality restrictions based on role
    if (quality === 'excellent' && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can export in excellent quality' });
    }
    
    if (quality === 'printing') {
      // Only owner, publisher, or admin can use printing quality
      if (bookRole === 'author' && !isAdmin) {
        return res.status(403).json({ error: 'Authors cannot export in printing quality' });
      }
    }

    // Load book data and validate all assets upfront (access check at export start)
    console.log(`[PDF Export] Starting validation for book ${bookId} by user ${userId}`);
    const bookData = await loadBookDataFromDB(bookId, userId);
    if (!bookData) {
      return res.status(403).json({ error: 'Not authorized to export this book' });
    }

    try {
      await validateExportAssets(bookData, userId, isAdmin);
    } catch (validationError) {
      console.error(`[PDF Export] Asset validation failed for book ${bookId}:`, validationError.message);
      return res.status(400).json({ error: `Cannot export: ${validationError.message}` });
    }

    // Create export record
    const result = await pool.query(
      `INSERT INTO public.pdf_exports 
       (book_id, user_id, status, quality, page_range, start_page, end_page) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [bookId, userId, 'pending', quality, pageRange, startPage || null, endPage || null]
    );

    const exportRecord = result.rows[0];

    // Bestimme Priorität (könnte später Premium-User bevorzugen)
    const priority = isOwner ? 10 : 5;

    // Extract token for protected image loading in PDF renderer (Puppeteer)
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || null;

    // Prepare options object
    const options = {
      quality,
      pageRange,
      startPage: pageRange === 'range' ? startPage : undefined,
      endPage: pageRange === 'range' ? endPage : undefined,
      currentPageNumber: pageRange === 'current' ? currentPageNumber : undefined,
      currentPageIndex: pageRange === 'current' ? currentPageIndex : undefined, // Keep for backwards compatibility
      useCMYK: useCMYK === true,
      iccProfile: useCMYK && iccProfile ? iccProfile : undefined,
      token,
      user: req.user ? { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role } : null
    };

    // Füge zur optimierten Queue hinzu
    const io = req.app.get('io');
    await exportQueue.addExport({
      exportId: exportRecord.id,
      bookId,
      userId,
      options,
      io,
      priority,
      processor: async (job) => {
        try {
          return await processExport(job);
        } catch (error) {
          // Safely convert error to string for database storage
          const errorMessage = safeErrorString(error);
          
          // Update status to failed
          await pool.query(
            `UPDATE public.pdf_exports 
             SET status = $1, error_message = $2, completed_at = CURRENT_TIMESTAMP 
             WHERE id = $3`,
            ['failed', errorMessage, exportRecord.id]
          );

          // Send failure notification
          if (io) {
            io.to(`user_${userId}`).emit('pdf_export_completed', {
              exportId: exportRecord.id,
              bookId,
              status: 'failed',
              error: errorMessage
            });
          }
          
          throw error;
        }
      }
    });

    res.json({
      id: exportRecord.id,
      bookId: exportRecord.book_id,
      status: exportRecord.status,
      createdAt: exportRecord.created_at,
      queuePosition: exportQueue.queue.length,
      estimatedWaitTime: exportQueue.queue.length * 30 // Grobe Schätzung: 30s pro Export
    });
  } catch (error) {
    console.error('Error creating PDF export:', error);
    
    // Spezifische Fehlerbehandlung
    if (error.message.includes('queue is full')) {
      return res.status(503).json({ error: 'Export queue is full. Please try again later.' });
    }
    if (error.message.includes('Too many exports')) {
      return res.status(429).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to create PDF export' });
  }
});

// Get all exports for a book
router.get('/book/:bookId', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;

    // Check book access
    const bookAccess = await pool.query(`
      SELECT b.* FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get exports
    const exportsResult = await pool.query(
      `SELECT * FROM public.pdf_exports 
       WHERE book_id = $1 
       ORDER BY created_at DESC`,
      [bookId]
    );

    res.json(exportsResult.rows.map(exp => ({
      id: exp.id,
      bookId: exp.book_id,
      userId: exp.user_id,
      status: exp.status,
      quality: exp.quality,
      pageRange: exp.page_range,
      startPage: exp.start_page,
      endPage: exp.end_page,
      fileSize: exp.file_size,
      errorMessage: exp.error_message,
      downloadCount: exp.download_count ?? 0,
      createdAt: exp.created_at,
      completedAt: exp.completed_at
    })));
  } catch (error) {
    console.error('Error fetching PDF exports:', error);
    res.status(500).json({ error: 'Failed to fetch PDF exports' });
  }
});

// Get count of PDF export notifications (for badge): within 24h AND not yet downloaded
router.get('/notification-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT COUNT(*)::int as count
       FROM public.pdf_exports pe
       JOIN public.books b ON pe.book_id = b.id
       WHERE pe.user_id = $1
         AND pe.status = 'completed'
         AND pe.created_at > NOW() - INTERVAL '24 hours'
         AND COALESCE(pe.download_count, 0) = 0
         AND (b.owner_id = $1 OR EXISTS (SELECT 1 FROM public.book_friends bf WHERE bf.book_id = b.id AND bf.user_id = $1))`,
      [userId]
    );

    res.json({ count: result.rows[0]?.count ?? 0 });
  } catch (error) {
    console.error('Error fetching PDF export notification count:', error);
    res.status(500).json({ count: 0 });
  }
});

// Get recent completed exports for notifications: within 24h AND not yet downloaded (download_count = 0)
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT pe.id, pe.book_id, pe.status, pe.created_at, b.name as book_name
       FROM public.pdf_exports pe
       JOIN public.books b ON pe.book_id = b.id
       WHERE pe.user_id = $1
         AND pe.status = 'completed'
         AND pe.created_at > NOW() - INTERVAL '24 hours'
         AND COALESCE(pe.download_count, 0) = 0
         AND (b.owner_id = $1 OR EXISTS (SELECT 1 FROM public.book_friends bf WHERE bf.book_id = b.id AND bf.user_id = $1))
       ORDER BY pe.created_at DESC
       LIMIT 20`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent PDF exports:', error);
    res.status(500).json({ error: 'Failed to fetch recent exports' });
  }
});

// Get single export
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT pe.*, b.owner_id 
       FROM public.pdf_exports pe
       JOIN public.books b ON pe.book_id = b.id
       WHERE pe.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Export not found' });
    }

    const exp = result.rows[0];

    // Check access (user must be owner or have book access)
    if (exp.owner_id !== userId) {
      const bookAccess = await pool.query(
        'SELECT * FROM public.book_friends WHERE book_id = $1 AND user_id = $2',
        [exp.book_id, userId]
      );
      if (bookAccess.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    res.json({
      id: exp.id,
      bookId: exp.book_id,
      userId: exp.user_id,
      status: exp.status,
      quality: exp.quality,
      pageRange: exp.page_range,
      startPage: exp.start_page,
      endPage: exp.end_page,
      fileSize: exp.file_size,
      errorMessage: exp.error_message,
      downloadCount: exp.download_count ?? 0,
      createdAt: exp.created_at,
      completedAt: exp.completed_at
    });
  } catch (error) {
    console.error('Error fetching PDF export:', error);
    res.status(500).json({ error: 'Failed to fetch PDF export' });
  }
});

// Download PDF
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT pe.*, b.owner_id, b.name as book_name
       FROM public.pdf_exports pe
       JOIN public.books b ON pe.book_id = b.id
       WHERE pe.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Export not found' });
    }

    const exp = result.rows[0];

    // Check access
    if (exp.owner_id !== userId) {
      const bookAccess = await pool.query(
        'SELECT * FROM public.book_friends WHERE book_id = $1 AND user_id = $2',
        [exp.book_id, userId]
      );
      if (bookAccess.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    if (exp.status !== 'completed' || !exp.file_path) {
      return res.status(400).json({ error: 'Export not ready for download' });
    }

    // Path-Traversal-Schutz
    const fullPath = path.resolve(exp.file_path);
    if (!isPathWithinUploads(fullPath)) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    // Increment download count
    await pool.query(
      'UPDATE public.pdf_exports SET download_count = COALESCE(download_count, 0) + 1 WHERE id = $1',
      [id]
    );

    // Send file
    const fileName = `${exp.book_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export_${exp.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = require('fs').createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({ error: 'Failed to download PDF' });
  }
});

// Delete export
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT pe.*, b.owner_id 
       FROM public.pdf_exports pe
       JOIN public.books b ON pe.book_id = b.id
       WHERE pe.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Export not found' });
    }

    const exp = result.rows[0];

    // Check access (only owner or export creator can delete)
    if (exp.owner_id !== userId && exp.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete file if exists (with Path-Traversal-Schutz)
    if (exp.file_path) {
      const fullPath = path.resolve(exp.file_path);
      if (isPathWithinUploads(fullPath)) {
        try {
          await fs.unlink(fullPath);
        } catch (error) {
          console.error('Error deleting PDF file:', error);
        }
      }
    }

    // Delete record
    await pool.query('DELETE FROM public.pdf_exports WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting PDF export:', error);
    res.status(500).json({ error: 'Failed to delete PDF export' });
  }
});

// Get queue status (Monitoring)
router.get('/queue/status', authenticateToken, async (req, res) => {
  try {
    // Optional: Nur für Admins
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ error: 'Not authorized' });
    // }
    
    const status = exportQueue.getStatus();
    const activeExports = exportQueue.getActiveExports();
    
    res.json({
      ...status,
      activeExports
    });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
});

module.exports = router;



