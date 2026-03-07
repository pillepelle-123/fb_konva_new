/**
 * Admin API Routes for Background Image Designer
 * Handles designer-created background images
 */

const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/requireAdmin');
const designerService = require('../../services/background-image-designer');
const { saveBackgroundImageFile } = require('../../services/file-storage');
const path = require('path');
const fs = require('fs/promises');
const { getUploadsSubdir } = require('../../utils/uploads-path');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10,
  },
});

const router = express.Router();

router.use(authenticateToken, requireAdmin);

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

    const updated = await designerService.updateDesignerImage(req.params.id, {
      name,
      slug,
      categoryId,
      description,
      canvasStructure,
      tags,
      metadata,
      defaultOpacity,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Designer image not found' });
    }

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

    // Save file to uploads/background-images/_designer/
    const stored = await saveBackgroundImageFile({
      category: '_designer',
      originalName: req.file.originalname,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
    });

    const apiPublicUrl = `/api/background-images/designer/assets/${stored.filePath.replace(/^\/+/, '')}`;

    res.status(201).json({
      asset: {
        originalName: req.file.originalname,
        storage: {
          ...stored,
          publicUrl: apiPublicUrl,
          thumbnailUrl: apiPublicUrl,
        },
      },
    });
  } catch (error) {
    console.error('Upload designer asset error:', error);
    res.status(500).json({ error: 'Failed to upload asset' });
  }
});

/**
 * Delete designer asset
 * DELETE /api/admin/background-images/designer/assets/:filename
 */
router.delete('/assets/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(getUploadsSubdir('background-images/designer'), filename);

    await fs.unlink(filePath);

    res.status(204).end();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Asset not found' });
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
  try {
    const designerImage = await designerService.getDesignerImage(req.params.id);
    
    if (!designerImage) {
      return res.status(404).json({ error: 'Designer image not found' });
    }

    // Get target dimensions (default to canvas dimensions)
    const targetWidth = req.body?.width || designerImage.canvas.canvasWidth;
    const targetHeight = req.body?.height || designerImage.canvas.canvasHeight;

    // TODO: Implement canvas-to-image generation
    // For now, return placeholder response
    res.status(501).json({
      message: 'Image generation not yet implemented',
      designerId: designerImage.id,
      targetSize: { width: targetWidth, height: targetHeight },
    });

    // Future implementation:
    // const canvasGenerator = require('../../services/canvas-image-generator');
    // const imageBuffer = await canvasGenerator.generateImage(
    //   designerImage.canvas.structure,
    //   targetWidth,
    //   targetHeight
    // );
    // 
    // // Save generated image
    // const outputPath = path.join(
    //   getUploadsSubdir('background-images/generated'),
    //   `${designerImage.id}_v${designerImage.canvas.version}.webp`
    // );
    // await fs.writeFile(outputPath, imageBuffer);
    //
    // // Generate thumbnail
    // const thumbnailBuffer = await canvasGenerator.createThumbnail(imageBuffer, 300, 400);
    // const thumbnailPath = outputPath.replace('.webp', '_thumb.webp');
    // await fs.writeFile(thumbnailPath, thumbnailBuffer);
    //
    // // Mark as generated in database
    // await designerService.markAsGenerated(
    //   designerImage.id,
    //   `/uploads/background-images/generated/${path.basename(outputPath)}`,
    //   `/uploads/background-images/generated/${path.basename(thumbnailPath)}`
    // );
    //
    // res.json({
    //   success: true,
    //   image: {
    //     url: `/api/background-images/${designerImage.slug}/file`,
    //     thumbnailUrl: `/api/background-images/${designerImage.slug}/thumbnail`,
    //   },
    // });
  } catch (error) {
    console.error('Generate image error:', error);
    res.status(500).json({ error: 'Failed to generate image' });
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
