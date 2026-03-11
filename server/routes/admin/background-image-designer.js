/**
 * Admin API Routes for Background Image Designer
 * Handles designer-created background images
 */

const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/requireAdmin');
const designerService = require('../../services/background-image-designer');
const path = require('path');
const fs = require('fs/promises');
const sharp = require('sharp');
const { randomUUID } = require('crypto');
const { getUploadsSubdir } = require('../../utils/uploads-path');
const { validateImageMagicBytes } = require('../../utils/image-validation');
const PDFRendererService = require('../../services/pdf-renderer-service');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10,
  },
});

const router = express.Router();

router.use(authenticateToken, requireAdmin);

function isLikelySvg(buffer) {
  if (!buffer || !buffer.length) return false;
  const sample = buffer.slice(0, 4096).toString('utf8').trimStart();
  return sample.startsWith('<svg') || (sample.startsWith('<?xml') && sample.includes('<svg'));
}

function getSafeSvgExt(originalName = '') {
  const ext = path.extname(originalName).toLowerCase();
  return ext === '.svg' ? '.svg' : '.svg';
}

function normalizeDesignerAssetUrl(uploadPath) {
  if (!uploadPath || typeof uploadPath !== 'string') {
    return uploadPath;
  }

  // SVGs are rendered natively in the PDF renderer (like stickers).
  // No format conversion needed – assets are served as-is.

  const uploadsMatch = uploadPath.match(/^https?:\/\/[^/]+\/uploads\/background-images\/(.+)$/i)
    || uploadPath.match(/^\/uploads\/background-images\/(.+)$/i);

  if (uploadsMatch && uploadsMatch[1]) {
    return `/api/background-images/designer/assets/${uploadsMatch[1]}`;
  }

  const rawPath = uploadPath.replace(/^\/+/u, '');
  if (
    rawPath.startsWith('_designer/')
    || rawPath.startsWith('designer/')
    || rawPath.startsWith('_image_assets/')
  ) {
    return `/api/background-images/designer/assets/${rawPath}`;
  }

  if (/^\/api\/background-images\/designer\/assets\//i.test(uploadPath)) {
    return uploadPath;
  }

  return uploadPath;
}

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toAbsolutePosition(value, canvasSize) {
  const numeric = toFiniteNumber(value, 0);
  // Support normalized coordinates, including positions outside page bounds
  // (e.g. -0.2 or 1.3 means partly/fully outside the page).
  // Legacy absolute payloads are typically much larger than this range.
  if (numeric >= -2 && numeric <= 2) {
    return numeric * canvasSize;
  }
  return numeric;
}

function mapDesignerCanvasToRenderableElements(canvasStructure, targetWidth, targetHeight) {
  const items = Array.isArray(canvasStructure?.items) ? canvasStructure.items : [];

  return items
    .map((item, index) => {
      // Positions are normalized (0-1), convert to absolute in target dimensions
      const x = toAbsolutePosition(item?.x, targetWidth);
      const y = toAbsolutePosition(item?.y, targetHeight);
      
      // Sizes are already absolute pixels - use as-is
      const width = toFiniteNumber(item?.width, 100);
      const height = toFiniteNumber(item?.height, 100);
      const rawRotation = toFiniteNumber(item?.rotation, 0);
      const rotation = Math.abs(rawRotation) < 0.01 ? 0 : rawRotation;
      const opacity = Math.max(0, Math.min(1, toFiniteNumber(item?.opacity, 1)));

      if (item?.type === 'image') {
        const normalizedSrc = normalizeDesignerAssetUrl(item.uploadPath);
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
          // Preserve designer behavior in export renderer (no cover-crop).
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

/**
 * List designer background images
 * GET /api/admin/background-images/designer
 */
router.get('/', async (req, res) => {
  try {
    const { page = '1', pageSize = '50', search, category, sort, order } = req.query;

    const result = await designerService.listDesignerImages({
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 50, 500),
      search,
      categorySlug: category,
      sort,
      order,
    });

    res.json(result);
  } catch (error) {
    console.error('List designer images error:', error);
    res.status(500).json({ error: 'Failed to list designer images' });
  }
});

/**
 * Create new designer background image
 * POST /api/admin/background-images/designer
 */
router.post('/', async (req, res) => {
  try {
    const { name, slug, categoryId, description, canvasStructure, tags, metadata } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ error: 'Name and categoryId are required' });
    }

    const designerImage = await designerService.createDesignerImage({
      name,
      slug,
      categoryId,
      description,
      canvasStructure: canvasStructure || {
        backgroundColor: '#ffffff',
        backgroundOpacity: 1,
        transparentBackground: false,
        items: [],
      },
      tags,
      metadata,
    });

    res.status(201).json({ image: designerImage });
  } catch (error) {
    console.error('Create designer image error:', error);
    res.status(500).json({ error: 'Failed to create designer image' });
  }
});

/**
 * List global designer image assets
 * GET /api/admin/background-images/designer/assets
 */
router.get('/assets', async (req, res) => {
  try {
    const { page = '1', pageSize = '100', search } = req.query;

    const result = await designerService.listDesignerImageAssets({
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 100, 500),
      search,
    });

    res.json(result);
  } catch (error) {
    console.error('List designer assets error:', error);
    res.status(500).json({ error: 'Failed to list designer assets' });
  }
});

/**
 * Get designer background image by ID
 * GET /api/admin/background-images/designer/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const designerImage = await designerService.getDesignerImage(req.params.id);
    
    if (!designerImage) {
      return res.status(404).json({ error: 'Designer image not found' });
    }

    res.json({ image: designerImage });
  } catch (error) {
    console.error('Get designer image error:', error);
    res.status(500).json({ error: 'Failed to fetch designer image' });
  }
});

/**
 * Update designer background image
 * PUT /api/admin/background-images/designer/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, slug, categoryId, description, canvasStructure, tags, metadata, defaultOpacity } = req.body;

    // Check if slug changed to trigger file rename
    const existingImage = await designerService.getDesignerImage(req.params.id);
    if (!existingImage) {
      return res.status(404).json({ error: 'Designer image not found' });
    }

    const updateData = {
      name,
      slug,
      categoryId,
      description,
      canvasStructure,
      tags,
      metadata,
      defaultOpacity,
    };

    // If slug changed and files exist, rename them
    if (slug && slug !== existingImage.slug && existingImage.storage?.filePath) {
      try {
        // Get new category slug if category changed
        let targetCategorySlug = existingImage.category?.slug;
        if (categoryId && categoryId !== existingImage.category?.id) {
          // Fetch category slug from DB
          const pool = require('../../utils/db');
          const catResult = await pool.query(
            'SELECT slug FROM background_image_categories WHERE id = $1',
            [categoryId]
          );
          targetCategorySlug = catResult.rows[0]?.slug || targetCategorySlug;
        }

        const { filePath, thumbnailPath } = await renameDesignerFiles(
          existingImage.storage.filePath,
          slug,
          existingImage.id,
          targetCategorySlug
        );

        updateData.filePath = filePath;
        updateData.thumbnailPath = thumbnailPath;
      } catch (error) {
        console.error('Error renaming files during slug update:', error);
        // Continue with update even if file rename fails
      }
    }

    const updated = await designerService.updateDesignerImage(req.params.id, updateData);
    res.json({ image: updated });
  } catch (error) {
    console.error('Update designer image error:', error);
    res.status(500).json({ error: 'Failed to update designer image' });
  }
});

/**
 * Delete designer background image
 * DELETE /api/admin/background-images/designer/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await designerService.deleteDesignerImage(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Designer image not found' });
    }

    res.status(204).end();
  } catch (error) {
    console.error('Delete designer image error:', error);
    res.status(500).json({ error: 'Failed to delete designer image' });
  }
});

/**
 * Upload asset for designer (images to be used in canvas)
 * POST /api/admin/background-images/designer/assets/upload
 */
router.post('/assets/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const originalName = req.file.originalname || 'asset';
    const mimeType = String(req.file.mimetype || '').toLowerCase();
    const isSvgMime = mimeType === 'image/svg+xml';

    let ext = '';
    let width = null;
    let height = null;

    if (isSvgMime || isLikelySvg(req.file.buffer)) {
      ext = getSafeSvgExt(originalName);
      if (!/\.svg$/i.test(originalName) && !isSvgMime) {
        return res.status(400).json({ error: 'Invalid file type. Allowed: PNG, JPG, SVG.' });
      }
    } else {
      const validation = validateImageMagicBytes(req.file.buffer);
      if (!validation.valid || !['png', 'jpg'].includes(validation.ext)) {
        return res.status(400).json({ error: 'Invalid file type. Allowed: PNG, JPG, SVG.' });
      }
      ext = validation.ext === 'jpg' ? '.jpg' : `.${validation.ext}`;

      const metadata = await sharp(req.file.buffer).metadata();
      width = metadata.width || null;
      height = metadata.height || null;
    }

    const baseDir = getUploadsSubdir('background-images');
    const assetsDir = path.join(baseDir, '_image_assets');
    const thumbsDir = path.join(assetsDir, '_thumbnails');
    await fs.mkdir(assetsDir, { recursive: true });
    await fs.mkdir(thumbsDir, { recursive: true });

    const fileId = randomUUID();
    const mainFileName = `${fileId}${ext}`;
    const thumbFileName = `${fileId}_thumb${ext}`;

    const mainAbsolutePath = path.join(assetsDir, mainFileName);
    const thumbAbsolutePath = path.join(thumbsDir, thumbFileName);

    await fs.writeFile(mainAbsolutePath, req.file.buffer);

    let thumbnailPath = `_image_assets/_thumbnails/${thumbFileName}`;

    if (ext === '.svg') {
      thumbnailPath = `_image_assets/${mainFileName}`;
    } else {
      await sharp(req.file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .toFile(thumbAbsolutePath);
    }

    const createdAsset = await designerService.createDesignerImageAsset({
      fileName: originalName,
      filePath: `_image_assets/${mainFileName}`,
      thumbnailPath,
      mimeType: ext === '.svg' ? 'image/svg+xml' : mimeType,
      fileSizeBytes: req.file.size,
      width,
      height,
      uploadedBy: req.user?.id ?? null,
    });

    res.status(201).json({ asset: createdAsset });
  } catch (error) {
    console.error('Upload designer asset error:', error);
    res.status(500).json({ error: 'Failed to upload asset' });
  }
});

/**
 * Delete designer asset
 * DELETE /api/admin/background-images/designer/assets/:assetId
 */
router.delete('/assets/:assetId', async (req, res) => {
  try {
    const deleted = await designerService.deleteDesignerImageAsset(req.params.assetId);
    if (!deleted) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.status(204).end();
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({ error: 'Asset is used in at least one design and cannot be deleted' });
    }
    console.error('Delete designer asset error:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

/**
 * Generate final image from canvas structure
 * POST /api/admin/background-images/designer/:id/generate
 * 
 * Body: { width, height } - Optional target dimensions
 */
router.post('/:id/generate', async (req, res) => {
  let renderer = null;
  try {
    const designerImage = await designerService.getDesignerImage(req.params.id);
    
    if (!designerImage) {
      return res.status(404).json({ error: 'Designer image not found' });
    }

    // Get target render dimensions (default to standard A4 @ 300 DPI)
    const defaultWidth = 2480;
    const defaultHeight = 3508;
    const requestedWidth = Number(req.body?.width || defaultWidth);
    const requestedHeight = Number(req.body?.height || defaultHeight);
    const targetWidth = Number.isFinite(requestedWidth) && requestedWidth > 0 ? Math.round(requestedWidth) : defaultWidth;
    const targetHeight = Number.isFinite(requestedHeight) && requestedHeight > 0 ? Math.round(requestedHeight) : defaultHeight;

    const renderElements = mapDesignerCanvasToRenderableElements(
      designerImage.canvas.structure,
      targetWidth,
      targetHeight,
    );

    console.log('[Designer Generate] Target dimensions:', { targetWidth, targetHeight });
    console.log('[Designer Generate] Mapped elements:', JSON.stringify(renderElements, null, 2));

    renderer = new PDFRendererService();
    await renderer.initialize();

    const renderPage = {
      id: 1,
      pageNumber: 1,
      elements: renderElements,
      background: designerImage.canvas.structure?.transparentBackground
        ? {
            type: 'color',
            value: 'transparent',
            opacity: 0,
          }
        : {
            type: 'color',
            value: designerImage.canvas.structure?.backgroundColor || '#ffffff',
            opacity: Number(designerImage.canvas.structure?.backgroundOpacity ?? 1),
          },
    };

    // The PDF renderer app expects a complete book contract, including pages[].
    const renderBook = {
      id: `designer-${designerImage.id}`,
      name: designerImage.name || 'Designer Background',
      pageSize: 'A4',
      orientation: targetWidth > targetHeight ? 'landscape' : 'portrait',
      pages: [renderPage],
      questions: [],
      answers: [],
      pageAssignments: [],
      colorPalettes: [],
      backgroundImages: [],
    };

    const imageBuffer = await renderer.renderPage({
      page: renderPage,
      book: renderBook,
      canvasWidth: targetWidth,
      canvasHeight: targetHeight,
    }, {
      scale: 1,
    });

    // Generate filename: {slug}_{uuid-prefix}.webp
    const baseDir = getUploadsSubdir('background-images');
    const categoryFolder = getCategoryFolder(designerImage.category?.slug);
    const categoryDir = path.join(baseDir, categoryFolder);
    await fs.mkdir(categoryDir, { recursive: true });

    const fileBaseName = generateDesignerFilename(designerImage.slug, designerImage.id);
    const outputFileName = `${fileBaseName}.webp`;
    const thumbnailFileName = `${fileBaseName}_thumb.webp`;
    const outputAbsolutePath = path.join(categoryDir, outputFileName);
    const thumbnailAbsolutePath = path.join(categoryDir, thumbnailFileName);

    // Delete old files if they exist (for re-generation)
    try {
      await fs.unlink(outputAbsolutePath).catch(() => {});
      await fs.unlink(thumbnailAbsolutePath).catch(() => {});
    } catch (error) {
      // Ignore deletion errors
    }

    await sharp(imageBuffer)
      .webp({ quality: 92 })
      .toFile(outputAbsolutePath);

    await sharp(imageBuffer)
      .resize(300, 400, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(thumbnailAbsolutePath);

    const dbFilePath = `${categoryFolder}/${outputFileName}`;
    const dbThumbnailPath = `${categoryFolder}/${thumbnailFileName}`;
    const imageIdentifier = encodeURIComponent(designerImage.slug || designerImage.id);

    await designerService.markAsGenerated(designerImage.id, dbFilePath, dbThumbnailPath);

    res.json({
      success: true,
      image: {
        id: designerImage.id,
        slug: designerImage.slug,
        filePath: dbFilePath,
        thumbnailPath: dbThumbnailPath,
        url: `/api/background-images/${imageIdentifier}/file`,
        thumbnailUrl: `/api/background-images/${imageIdentifier}/thumbnail`,
      },
      targetSize: {
        width: targetWidth,
        height: targetHeight,
      },
    });
  } catch (error) {
    console.error('Generate image error:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  } finally {
    if (renderer) {
      try {
        await renderer.cleanup();
      } catch (cleanupError) {
        console.error('Generate cleanup error:', cleanupError);
      }
    }
  }
});

/**
 * Get preview of designer image
 * GET /api/admin/background-images/designer/:id/preview
 */
router.get('/:id/preview', async (req, res) => {
  try {
    const designerImage = await designerService.getDesignerImage(req.params.id);
    
    if (!designerImage) {
      return res.status(404).json({ error: 'Designer image not found' });
    }

    // Return canvas structure for client-side rendering
    res.json({
      canvas: designerImage.canvas,
    });
  } catch (error) {
    console.error('Get preview error:', error);
    res.status(500).json({ error: 'Failed to fetch preview' });
  }
});

module.exports = router;

/**
 * Generate filename for designer background image
 * Format: {slug}_{uuid-prefix}.webp
 * @param {string} slug - Image slug
 * @param {string} uuid - Full UUID
 * @returns {string} Filename without extension
 */
function generateDesignerFilename(slug, uuid) {
  const sanitizedSlug = slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const uuidPrefix = uuid.substring(0, 8);
  return `${sanitizedSlug}-${uuidPrefix}`;
}

/**
 * Get category folder path for designer images
 * @param {string|null} categorySlug - Category slug or null
 * @returns {string} Relative folder path
 */
function getCategoryFolder(categorySlug) {
  if (!categorySlug) {
    return 'uncategorized';
  }
  return categorySlug.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

/**
 * Rename designer image files when slug changes
 * @param {string} oldFilePath - Old relative file path
 * @param {string} newSlug - New slug
 * @param {string} uuid - Image UUID
 * @param {string} categorySlug - Category slug
 * @returns {Promise<{filePath: string, thumbnailPath: string}>} New paths
 */
async function renameDesignerFiles(oldFilePath, newSlug, uuid, categorySlug) {
  if (!oldFilePath) {
    return { filePath: null, thumbnailPath: null };
  }

  const baseDir = getUploadsSubdir('background-images');
  const categoryFolder = getCategoryFolder(categorySlug);
  const newBaseName = generateDesignerFilename(newSlug, uuid);

  // Parse old paths
  const oldFileAbsPath = path.join(baseDir, oldFilePath.replace(/^\/+/, ''));
  const oldDir = path.dirname(oldFilePath);
  const oldExt = path.extname(oldFilePath);
  const oldThumbnailPath = oldFilePath.replace(oldExt, `_thumb${oldExt}`);
  const oldThumbAbsPath = path.join(baseDir, oldThumbnailPath.replace(/^\/+/, ''));

  // Generate new paths
  const newFilePath = `${categoryFolder}/${newBaseName}${oldExt}`;
  const newThumbnailPath = `${categoryFolder}/${newBaseName}_thumb${oldExt}`;
  const newFileAbsPath = path.join(baseDir, newFilePath);
  const newThumbAbsPath = path.join(baseDir, newThumbnailPath);

  // Create target directory
  await fs.mkdir(path.dirname(newFileAbsPath), { recursive: true });

  // Rename files if they exist
  try {
    const fileExists = await fs.access(oldFileAbsPath).then(() => true).catch(() => false);
    if (fileExists) {
      await fs.rename(oldFileAbsPath, newFileAbsPath);
    }

    const thumbExists = await fs.access(oldThumbAbsPath).then(() => true).catch(() => false);
    if (thumbExists) {
      await fs.rename(oldThumbAbsPath, newThumbAbsPath);
    }

  } catch (error) {
    console.error('Error renaming designer files:', error);
    // Don't throw - we'll update DB paths even if physical rename fails
  }

  return {
    filePath: newFilePath,
    thumbnailPath: newThumbnailPath,
  };
}
