const express = require('express');
const { Pool } = require('pg');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { generatePDFFromBook } = require('../services/pdf-export');
const PDFExportQueue = require('../services/pdf-export-queue');
const { getUploadsDir, getUploadsSubdir, isPathWithinUploads } = require('../utils/uploads-path');
const stickersService = require('../services/stickers');
const backgroundImagesService = require('../services/background-images');

const router = express.Router();

// Regex to match protected image URLs for replacement (relative or absolute)
const PROTECTED_IMAGE_URL_PATTERN = /\/api\/images\/file\/(\d+)(?:\?.*)?$/;
const PROTECTED_STICKER_URL_PATTERN = /\/api\/stickers\/([^/]+)\/(?:file|thumbnail)(?:\?.*)?$/;
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
    if (!isOwner && !belongsToBook && !hasBookAccess) return null;

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
    if (!image || image.storage?.type !== 'local' || !image.storage?.filePath) return null;

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
    if (m) return imageIdToDataUrl(parseInt(m[1], 10)) || src;

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
      if ((element.type === 'image' || element.type === 'sticker') && element.src) {
        const dataUrl = await resolveUrl(element.src);
        if (dataUrl) element.src = dataUrl;
      }
    }

    // Resolve page background image
    const bg = page.background;
    if (bg?.type === 'image' && bg?.value) {
      const dataUrl = await resolveUrl(bg.value);
      if (dataUrl) {
        page.background = { ...bg, value: dataUrl };
      }
    }
  }

  return bookData;
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

  // Generate PDF
  const pdfPath = await generatePDFFromBook(
    bookData,
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

        return element;
      });

      const pageResult = {
        id: page.id,
        pageNumber: page.page_number,
        elements: updatedElements,
        background: {
          ...pageData.background,
          pageTheme: page.theme_id || null
        },
        layoutTemplateId: page.layout_template_id,
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
      createdAt: exp.created_at,
      completedAt: exp.completed_at
    })));
  } catch (error) {
    console.error('Error fetching PDF exports:', error);
    res.status(500).json({ error: 'Failed to fetch PDF exports' });
  }
});

// Get recent completed exports (last 24h) for notifications
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



