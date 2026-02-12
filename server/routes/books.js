const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');
const {
  createOrUpdateBookConversation,
  addUsersToBookConversation,
  removeUsersFromBookConversation,
  setBookConversationActive,
  syncGroupChatForBook,
} = require('../services/book-chats');

const router = express.Router();

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

const normalizePageMetadata = (page = {}) => {
  const pageType = page.pageType ?? page.page_type ?? 'content';
  const pagePairId = page.pagePairId ?? page.page_pair_id ?? null;
  const isSpecialPage =
    page.isSpecialPage ??
    page.is_special_page ??
    Boolean(pageType && pageType !== 'content');
  const isLocked = page.isLocked ?? page.is_locked ?? false;
  const isPrintable =
    page.isPrintable ?? page.is_printable ?? true;
  const layoutVariation =
    page.layoutVariation ?? page.layout_variation ?? 'normal';
  const backgroundVariation =
    page.backgroundVariation ?? page.background_variation ?? 'normal';
  const backgroundTransform =
    parseJsonField(page.backgroundTransform ?? page.background_transform) ?? null;

  return {
    pageType,
    pagePairId,
    isSpecialPage,
    isLocked,
    isPrintable,
    layoutVariation,
    backgroundVariation,
    backgroundTransform
  };
};

// Dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get owned books count
    const ownedBooks = await pool.query(
      'SELECT COUNT(*) FROM public.books WHERE owner_id = $1 AND archived = FALSE',
      [userId]
    );

    // Get collaborated books count
    const collaboratedBooks = await pool.query(
      'SELECT COUNT(*) FROM public.book_friends WHERE user_id = $1',
      [userId]
    );

    // Get total collaborators across all user's books
    const collaborators = await pool.query(`
      SELECT COUNT(DISTINCT bf.user_id) 
      FROM public.book_friends bf
      JOIN public.books b ON bf.book_id = b.id
      WHERE b.owner_id = $1 OR bf.user_id = $1
    `, [userId]);

    // Get recent books (owned + collaborated)
    const recentBooks = await pool.query(`
      SELECT DISTINCT b.id, b.name, b.updated_at, b.owner_id,
        (SELECT COUNT(*) FROM public.book_friends WHERE book_id = b.id) as collaborator_count
      FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE (b.owner_id = $1 OR bf.user_id = $1) AND b.archived = FALSE
      ORDER BY b.updated_at DESC
      LIMIT 5
    `, [userId]);

    res.json({
      stats: {
        myBooks: parseInt(ownedBooks.rows[0].count),
        contributedBooks: parseInt(collaboratedBooks.rows[0].count),
        totalCollaborators: parseInt(collaborators.rows[0].count)
      },
      recentBooks: recentBooks.rows.map(book => {
        const isOwner = book.owner_id === userId;
        return {
          id: book.id,
          name: book.name,
          lastModified: book.updated_at,
          collaboratorCount: parseInt(book.collaborator_count),
          isOwner: isOwner,
          userRole: isOwner ? 'owner' : 'author' // Default for dashboard, could be enhanced
        };
      })
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all books (non-archived)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const books = await pool.query(`
      SELECT DISTINCT b.id, b.name, b.page_size, b.orientation, b.owner_id, b.created_at, b.updated_at,
        b.min_pages, b.max_pages, b.page_pairing_enabled, b.special_pages_config,
        b.layout_strategy, b.layout_random_mode, b.assisted_layouts,
        COALESCE((SELECT COUNT(*) FROM public.pages WHERE book_id = b.id), 0) as page_count,
        COALESCE((SELECT COUNT(*) FROM public.book_friends WHERE book_id = b.id), 0) as collaborator_count,
        bf.book_role
      FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $1
      WHERE (b.owner_id = $1 OR bf.user_id = $1) AND b.archived = FALSE
      ORDER BY b.created_at DESC
    `, [userId]);

    res.json(books.rows.map(book => {
      const isOwner = book.owner_id === userId;
      const userRole = isOwner ? 'owner' : book.book_role;
      const specialPagesConfig = parseJsonField(book.special_pages_config);
      const assistedLayouts = parseJsonField(book.assisted_layouts);
      
      return {
        id: book.id,
        name: book.name,
        pageSize: book.page_size,
        orientation: book.orientation,
        pageCount: parseInt(book.page_count) || 0,
        collaboratorCount: parseInt(book.collaborator_count) || 0,
        isOwner: isOwner,
        userRole: userRole,
        created_at: book.created_at,
        updated_at: book.updated_at,
        minPages: book.min_pages,
        maxPages: book.max_pages,
        pagePairingEnabled: book.page_pairing_enabled,
        specialPagesConfig,
        layoutStrategy: book.layout_strategy,
        layoutRandomMode: book.layout_random_mode,
        assistedLayouts
      };
    }));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get archived books
router.get('/archived', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const books = await pool.query(`
      SELECT DISTINCT b.id, b.name, b.page_size, b.orientation, b.owner_id, b.created_at, bf.book_role,
        b.min_pages, b.max_pages, b.page_pairing_enabled, b.special_pages_config,
        b.layout_strategy, b.layout_random_mode, b.assisted_layouts
      FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $1
      WHERE (b.owner_id = $1 OR bf.user_id = $1) AND b.archived = TRUE
      ORDER BY b.created_at DESC
    `, [userId]);

    res.json(books.rows.map(book => {
      const isOwner = book.owner_id === userId;
      const userRole = isOwner ? 'owner' : book.book_role;
      const specialPagesConfig = parseJsonField(book.special_pages_config);
      const assistedLayouts = parseJsonField(book.assisted_layouts);
      
      return {
        id: book.id,
        name: book.name,
        pageSize: book.page_size,
        orientation: book.orientation,
        isOwner: isOwner,
        userRole: userRole,
        createdAt: book.created_at,
        minPages: book.min_pages,
        maxPages: book.max_pages,
        pagePairingEnabled: book.page_pairing_enabled,
        specialPagesConfig,
        layoutStrategy: book.layout_strategy,
        layoutRandomMode: book.layout_random_mode,
        assistedLayouts
      };
    }));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single book with pages
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    // Parse pagination parameters
    const pageOffset = parseInt(req.query.pageOffset) || 0;
    const pageLimit = parseInt(req.query.pageLimit) || 0;
    const pagesOnly = req.query.pagesOnly === 'true';

    // Check if user has access to this book
    const bookAccess = await pool.query(`
      SELECT b.* FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const book = bookAccess.rows[0];
    const specialPagesConfig = parseJsonField(book.special_pages_config) || null;
    const assistedLayouts = parseJsonField(book.assisted_layouts) || null;

    // Get total page count
    const totalPagesResult = await pool.query(
      'SELECT COUNT(*) as count FROM public.pages WHERE book_id = $1',
      [bookId]
    );
    const totalPages = parseInt(totalPagesResult.rows[0].count);

    // Get pages for this book (with pagination if specified)
    let pages;
    if (pageLimit > 0 && pageOffset >= 0) {
      pages = await pool.query(
        'SELECT * FROM public.pages WHERE book_id = $1 ORDER BY page_number ASC LIMIT $2 OFFSET $3',
        [bookId, pageLimit, pageOffset]
      );
    } else {
      pages = await pool.query(
        'SELECT * FROM public.pages WHERE book_id = $1 ORDER BY page_number ASC',
        [bookId]
      );
    }
    
    // Get all answers for this book to populate canvas elements (only if not pagesOnly)
    let allAnswers = [];
    if (!pagesOnly) {
      const answersResult = await pool.query(`
        SELECT a.* FROM public.answers a
        JOIN public.questions q ON a.question_id = q.id
        WHERE q.book_id = $1
      `, [bookId]);
      allAnswers = answersResult.rows;
    }
    
    // Get user-specific answers for the current user (only if not pagesOnly)
    let userAnswers = [];
    if (!pagesOnly) {
      const userAnswersResult = await pool.query(`
        SELECT a.* FROM public.answers a
        JOIN public.questions q ON a.question_id = q.id
        WHERE q.book_id = $1 AND a.user_id = $2
      `, [bookId, userId]);
      userAnswers = userAnswersResult.rows;
    }

    // Get questions for this book (only if not pagesOnly)
    let questions = [];
    if (!pagesOnly) {
      const questionsResult = await pool.query(
        'SELECT * FROM public.questions WHERE book_id = $1 ORDER BY display_order ASC NULLS LAST, created_at ASC',
        [bookId]
      );
      questions = questionsResult.rows;
    }

    // Get page assignments for this book (only if not pagesOnly)
    let pageAssignments = [];
    if (!pagesOnly) {
      const assignmentsResult = await pool.query(`
        SELECT pa.page_id, pa.user_id, p.page_number, u.name, u.email, u.role
        FROM public.page_assignments pa
        JOIN public.pages p ON pa.page_id = p.id
        JOIN public.users u ON pa.user_id = u.id
        WHERE p.book_id = $1
      `, [bookId]);
      pageAssignments = assignmentsResult.rows;
    }

    // Get user role and permissions for this book (always needed)
    let userRole = null;
    if (book.owner_id === userId) {
      userRole = {
        role: 'publisher',
        assignedPages: [],
        page_access_level: 'all_pages',
        editor_interaction_level: 'full_edit_with_settings'
      };
    } else {
      const collaborator = await pool.query(
        'SELECT book_role, page_access_level, editor_interaction_level FROM public.book_friends WHERE book_id = $1 AND user_id = $2',
        [bookId, userId]
      );
      
      if (collaborator.rows.length > 0) {
        let assignedPages = [];
        if (collaborator.rows[0].book_role === 'author') {
          const assignments = await pool.query(`
            SELECT p.page_number FROM public.page_assignments pa
            JOIN public.pages p ON pa.page_id = p.id
            WHERE p.book_id = $1 AND pa.user_id = $2
          `, [bookId, userId]);
          assignedPages = assignments.rows.map(row => row.page_number);
        }
        
        userRole = {
          role: collaborator.rows[0].book_role,
          assignedPages,
          page_access_level: collaborator.rows[0].page_access_level,
          editor_interaction_level: collaborator.rows[0].editor_interaction_level
        };
      }
    }

    // Get user's admin role (users.role) for PDF export quality restrictions
    const userResult = await pool.query(
      'SELECT role FROM public.users WHERE id = $1',
      [userId]
    );
    const userAdminRole = userResult.rows[0]?.role || null;

    // Build response object
    const response = {
      id: book.id,
      name: book.name,
      pageSize: book.page_size,
      orientation: book.orientation,
      owner_id: book.owner_id,
      bookTheme: book.theme_id, // Use theme_id (book_theme was deprecated)
      layoutTemplateId: book.layout_template_id,
      themeId: book.theme_id,
      colorPaletteId: book.color_palette_id,
      minPages: book.min_pages,
      maxPages: book.max_pages,
      pagePairingEnabled: book.page_pairing_enabled,
      specialPagesConfig,
      layoutStrategy: book.layout_strategy,
      layoutRandomMode: book.layout_random_mode,
      assistedLayouts,
      groupChatEnabled: Boolean(book.group_chat_enabled),
      group_chat_enabled: Boolean(book.group_chat_enabled),
      questions: questions,
      answers: allAnswers,
      pageAssignments: pageAssignments,
      userRole: userRole,
      userAdminRole: userAdminRole, // users.role for PDF export quality restrictions
      totalPages,
      pages: pages.rows.map(page => {
        // Parse page.elements - it's JSONB, so it might be an object or need parsing
        let pageData = {};
        if (page.elements) {
          // If it's already an object (from JSONB), use it directly
          if (typeof page.elements === 'object' && !Array.isArray(page.elements)) {
            pageData = page.elements;
          } else if (typeof page.elements === 'string') {
            // If it's a string, parse it
            try {
              pageData = JSON.parse(page.elements);
            } catch (e) {
              pageData = {};
            }
          } else {
            // If it's an array or null, create default structure
            pageData = { elements: Array.isArray(page.elements) ? page.elements : [] };
          }
        }
        const elements = pageData.elements || [];
        const metadataSource = { ...pageData, ...page };
        const pageMeta = normalizePageMetadata(metadataSource);
        const backgroundTransform = pageMeta.backgroundTransform;
        
        // Update answer elements with actual answer text from assigned users
        const updatedElements = elements.map(element => {
          if (element.textType === 'answer') {
            // Find the user assigned to this page
            const pageAssignment = pageAssignments.find(pa => pa.page_id === page.id);
            if (pageAssignment) {
              // If answer element has no questionId, find question on same page
              let questionId = element.questionId;
              if (!questionId) {
                const questionElement = elements.find(el => el.textType === 'question' && el.questionId);
                if (questionElement) {
                  questionId = questionElement.questionId;
                }
              }
              
              if (questionId) {
                // Find the answer from the assigned user
                const assignedUserAnswer = allAnswers.find(a => 
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
          return element;
        });
        
        return {
          id: page.id,
          pageNumber: page.page_number,
          elements: updatedElements,
          background: {
            ...pageData.background,
            pageTheme: page.theme_id || null
          },
          layoutTemplateId: page.layout_template_id,
          // Only set themeId if it's not null - if it's null, the page inherits the book theme
          // This way, pages that inherit the book theme won't have themeId property at all
          ...(page.theme_id ? { themeId: page.theme_id } : {}),
          colorPaletteId: page.color_palette_id,
          pageType: pageMeta.pageType,
          pagePairId: pageMeta.pagePairId || undefined,
          isSpecialPage: pageMeta.isSpecialPage,
          isLocked: pageMeta.isLocked,
          isPrintable: pageMeta.isPrintable,
          layoutVariation: pageMeta.layoutVariation,
          backgroundVariation: pageMeta.backgroundVariation,
          ...(backgroundTransform ? { backgroundTransform } : {})
        };
      })
    };

    // Add pagination info only when using explicit limits
    if (pageLimit > 0 && pageOffset >= 0) {
      response.pagination = {
        totalPages,
        limit: pageLimit,
        offset: pageOffset
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching book:', error);
    console.error('Book ID:', req.params.id);
    console.error('User ID:', req.user?.id);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update book pages for authors (only assigned pages)
router.put('/:id/author-save', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;
    const { pages } = req.body;

    // Check if user is author
    const collaborator = await pool.query(
      'SELECT book_role FROM public.book_friends WHERE book_id = $1 AND user_id = $2',
      [bookId, userId]
    );

    if (collaborator.rows.length === 0 || collaborator.rows[0].book_role !== 'author') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get assigned pages
    const assignments = await pool.query(`
      SELECT p.page_number FROM public.page_assignments pa
      JOIN public.pages p ON pa.page_id = p.id
      WHERE p.book_id = $1 AND pa.user_id = $2
    `, [bookId, userId]);
    const assignedPageIds = assignments.rows.map(row => row.page_number);

    // Update only assigned pages and handle question associations
    for (const page of pages) {
      if (assignedPageIds.includes(page.pageNumber)) {
        // Get the page ID
        const pageResult = await pool.query(
          'SELECT id FROM public.pages WHERE book_id = $1 AND page_number = $2',
          [bookId, page.pageNumber]
        );
        
        if (pageResult.rows.length > 0) {
          const pageId = pageResult.rows[0].id;
          
          // Update page data with complete structure
          // Ensure elements is always an array
          const pageElements = Array.isArray(page.elements) ? page.elements : (page.elements?.elements || []);
          const pageMeta = normalizePageMetadata(page);
          const completePageData = {
            id: pageId,
            elements: pageElements,
            background: page.background || { pageTheme: null },
            pageNumber: page.pageNumber,
            database_id: pageId,
            pageType: pageMeta.pageType,
            pagePairId: pageMeta.pagePairId,
            isSpecialPage: pageMeta.isSpecialPage,
            isLocked: pageMeta.isLocked,
            isPrintable: pageMeta.isPrintable,
            layoutVariation: pageMeta.layoutVariation,
            backgroundVariation: pageMeta.backgroundVariation,
            ...(pageMeta.backgroundTransform ? { backgroundTransform: pageMeta.backgroundTransform } : {})
          };
          
          // Only set theme_id if themeId property exists in the page object
          // If themeId doesn't exist, the page inherits the book theme, so set theme_id to null
          const themeIdToSave = 'themeId' in page ? (page.themeId || null) : null;
          
          await pool.query(
            `UPDATE public.pages 
             SET elements = $1,
                 layout_template_id = $2,
                 theme_id = $3,
                 color_palette_id = $4,
                 page_type = $5,
                 page_pair_id = $6,
                 is_special_page = $7,
                 is_locked = $8,
                 is_printable = $9,
                 layout_variation = $10,
                 background_variation = $11,
                 background_transform = $12
             WHERE id = $13`,
            [
              JSON.stringify(completePageData), 
              page.layoutTemplateId || null,
              themeIdToSave,
              page.colorPaletteId || null,
              pageMeta.pageType,
              pageMeta.pagePairId,
              pageMeta.isSpecialPage,
              pageMeta.isLocked,
              pageMeta.isPrintable,
              pageMeta.layoutVariation,
              pageMeta.backgroundVariation,
              pageMeta.backgroundTransform ? JSON.stringify(pageMeta.backgroundTransform) : null,
              pageId
            ]
          );

          // Remove existing question associations for this page
          await pool.query(
            'DELETE FROM public.question_pages WHERE page_id = $1',
            [pageId]
          );

          // Get assigned user for this page first
          const pageAssignment = await pool.query(
            'SELECT user_id FROM public.page_assignments WHERE page_id = $1',
            [pageId]
          );
          
          // Add new question associations and create answer placeholders
          // Ensure elements is always an array
          const elements = Array.isArray(page.elements) ? page.elements : (page.elements?.elements || []);
          let elementsUpdated = false;
          
          for (const element of elements) {
            // Question or QnA elements have a question on the page (questionId is UUID)
            const hasQuestionOnPage = (element.textType === 'question' || element.textType === 'qna') && element.questionId;
            if (hasQuestionOnPage) {
              const questionExists = await pool.query(
                'SELECT id FROM public.questions WHERE id = $1',
                [element.questionId]
              );
              
              if (questionExists.rows.length > 0) {
                await pool.query(
                  'INSERT INTO public.question_pages (question_id, page_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                  [element.questionId, pageId]
                );
              }
            }
            
            // Create answer placeholders for answer elements (or QnA which has answer area)
            if ((element.textType === 'answer' || element.textType === 'qna') && element.questionId && pageAssignment.rows.length > 0) {
              const assignedUserId = pageAssignment.rows[0].user_id;
              
              // Check if question exists before creating answer
              const questionExists = await pool.query(
                'SELECT id FROM public.questions WHERE id = $1',
                [element.questionId]
              );
              
              if (questionExists.rows.length > 0) {
                // Check if answer already exists
                const existingAnswer = await pool.query(
                  'SELECT id FROM public.answers WHERE question_id = $1 AND user_id = $2',
                  [element.questionId, assignedUserId]
                );
                
                if (existingAnswer.rows.length === 0) {
                  // Create new answer placeholder
                  const newAnswer = await pool.query(
                    'INSERT INTO public.answers (id, question_id, user_id, answer_text) VALUES (uuid_generate_v4(), $1, $2, $3) RETURNING id',
                    [element.questionId, assignedUserId, '']
                  );
                  
                  element.answerId = newAnswer.rows[0].id;
                  elementsUpdated = true;
                } else {
                  element.answerId = existingAnswer.rows[0].id;
                  elementsUpdated = true;
                }
              }
            }
          }
          
          // Update page elements if answer IDs were added
          if (elementsUpdated) {
            const updatedPageData = {
              id: pageId,
              elements: elements,
              background: page.background || { pageTheme: null },
              pageNumber: page.pageNumber,
              database_id: pageId
            };
            
            await pool.query(
              'UPDATE public.pages SET elements = $1 WHERE id = $2',
              [JSON.stringify(updatedPageData), pageId]
            );
          }
        }
      }
    }

    // Update book timestamp
    await pool.query(
      'UPDATE public.books SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [bookId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Track ongoing save operations to prevent duplicates
const ongoingSaves = new Set();

// Update book and pages
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;
    const { name, pageSize, orientation, pages, onlyModifiedPages } = req.body;
    
    // Prevent duplicate save operations
    const saveKey = `${userId}-${bookId}`;
    if (ongoingSaves.has(saveKey)) {
      return res.status(409).json({ error: 'Save already in progress' });
    }
    
    ongoingSaves.add(saveKey);

    // Check if user has access to this book
    const bookAccess = await pool.query(`
      SELECT b.* FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // If only name is provided (book rename), just update the name
    if (name && !pageSize && !orientation && !pages) {
      await pool.query(
        'UPDATE public.books SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [name, bookId]
      );
      return res.json({ success: true });
    }

    // Full book update with pages
    if (pageSize && orientation && pages) {
      // Update book metadata
      const bookTheme = req.body.bookTheme || req.body.themeId || 'default';
      await pool.query(
        `UPDATE public.books 
         SET name = $1,
             page_size = $2,
             orientation = $3,
             layout_template_id = $4,
             theme_id = $5,
             color_palette_id = $6,
             min_pages = $7,
             max_pages = $8,
             page_pairing_enabled = $9,
             special_pages_config = $10,
             layout_strategy = $11,
             layout_random_mode = $12,
             assisted_layouts = $13,
             invite_message = $14,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $15`,
        [
          name, 
          pageSize, 
          orientation, 
          req.body.layoutTemplateId || null,
          req.body.themeId || bookTheme,
          req.body.colorPaletteId || null,
          req.body.minPages ?? null,
          req.body.maxPages ?? null,
          req.body.pagePairingEnabled ?? false,
          req.body.specialPagesConfig ? JSON.stringify(req.body.specialPagesConfig) : null,
          req.body.layoutStrategy || null,
          req.body.layoutRandomMode || null,
          req.body.assistedLayouts ? JSON.stringify(req.body.assistedLayouts) : null,
          req.body.inviteMessage || null,
          bookId
        ]
      );

      // Only temporarily set page numbers to negative if we're saving all pages (not partial save)
      if (!onlyModifiedPages) {
        // First, temporarily set all existing page numbers to negative values to avoid conflicts
        await pool.query(
          'UPDATE public.pages SET page_number = -page_number WHERE book_id = $1 AND page_number > 0',
          [bookId]
        );
      }
      
      // UPSERT pages: update existing, insert new
      // Process pages in reverse order (highest pageNumber first) to avoid conflicts
      // when pages are moved to different positions
      const pagesToProcess = [...pages].sort((a, b) => (b.pageNumber || 0) - (a.pageNumber || 0));
      
      const processedPageIds = new Set();
      const allPageIds = [];
      
      for (const page of pagesToProcess) {
        let pageId;
        
        // Only skip if the page was already processed AND it has a valid database ID
        // This allows pages that were just inserted to be updated later if needed
        if (page.id && processedPageIds.has(page.id) && typeof page.id === 'number' && Number.isInteger(page.id) && page.id > 0 && page.id < 2147483647) {
          // Check if this page already has the target pageNumber in the database
          // If so, we can skip it. If not, we should update it.
          const existingPageCheck = await pool.query(
            'SELECT page_number FROM public.pages WHERE id = $1 AND book_id = $2',
            [page.id, bookId]
          );
          if (existingPageCheck.rows.length > 0) {
            const currentPageNumber = existingPageCheck.rows[0].page_number;
            // Only skip if the page already has the target pageNumber
            if (Math.abs(currentPageNumber) === page.pageNumber) {
              // Still add to allPageIds to prevent deletion
              if (page.id && typeof page.id === 'number' && Number.isInteger(page.id) && page.id > 0 && page.id < 2147483647) {
                allPageIds.push(page.id);
              }
              continue;
            }
          }
        }
        
        if (page.id && typeof page.id === 'number' && Number.isInteger(page.id) && page.id > 0 && page.id < 2147483647) {
          // Update existing page
          // First, check if another page (not this one) already has the target pageNumber
          // If so, we need to temporarily move it to avoid conflicts
          const conflictingPage = await pool.query(
            'SELECT id FROM public.pages WHERE book_id = $1 AND ABS(page_number) = $2 AND id != $3',
            [bookId, page.pageNumber, page.id]
          );
          
          if (conflictingPage.rows.length > 0) {
            // Another page has this pageNumber - temporarily move it to a negative value
            // This will be resolved when page numbers are restored at the end
            const conflictingPageId = conflictingPage.rows[0].id;
            // Only move if it hasn't been processed yet (to avoid overwriting changes)
            // Only move pages with positive page_number (not already moved)
            if (!processedPageIds.has(conflictingPageId)) {
              // Get the current page_number to encode it properly
              const currentPage = await pool.query(
                'SELECT page_number FROM public.pages WHERE id = $1 AND book_id = $2',
                [conflictingPageId, bookId]
              );
              if (currentPage.rows.length > 0) {
                const currentPageNumber = currentPage.rows[0].page_number;
                // Only move if page_number is positive (not already moved)
                if (currentPageNumber > 0) {
                  // Calculate the new page_number in JavaScript to avoid PostgreSQL type ambiguity
                  const newPageNumber = -currentPageNumber - 10000;
                  await pool.query(
                    'UPDATE public.pages SET page_number = $1 WHERE id = $2 AND book_id = $3',
                    [newPageNumber, conflictingPageId, bookId]
                  );
                  // Add to allPageIds to prevent deletion, even though it's not being updated
                  if (conflictingPageId && typeof conflictingPageId === 'number' && Number.isInteger(conflictingPageId) && conflictingPageId > 0 && conflictingPageId < 2147483647) {
                    allPageIds.push(conflictingPageId);
                  }
                }
              }
            }
          }
          
          // Ensure elements is always an array
          const pageElements = Array.isArray(page.elements) ? page.elements : (page.elements?.elements || []);
          const pageMeta = normalizePageMetadata(page);
          const completePageData = {
            id: page.id,
            elements: pageElements,
            background: page.background || { pageTheme: null },
            pageNumber: page.pageNumber,
            database_id: page.id,
            pageType: pageMeta.pageType,
            pagePairId: pageMeta.pagePairId,
            isSpecialPage: pageMeta.isSpecialPage,
            isLocked: pageMeta.isLocked,
            isPrintable: pageMeta.isPrintable,
            layoutVariation: pageMeta.layoutVariation,
            backgroundVariation: pageMeta.backgroundVariation,
            ...(pageMeta.backgroundTransform ? { backgroundTransform: pageMeta.backgroundTransform } : {})
          };

          // Only set theme_id if themeId property exists in the page object
          // If themeId doesn't exist, the page inherits the book theme, so set theme_id to null
          const themeIdToSave = 'themeId' in page ? (page.themeId || null) : null;
          
          await pool.query(
            `UPDATE public.pages 
             SET page_number = $1,
                 elements = $2,
                 layout_template_id = $3,
                 theme_id = $4,
                 color_palette_id = $5,
                 page_type = $6,
                 page_pair_id = $7,
                 is_special_page = $8,
                 is_locked = $9,
                 is_printable = $10,
                 layout_variation = $11,
                 background_variation = $12,
                 background_transform = $13
             WHERE id = $14 AND book_id = $15`,
            [
              page.pageNumber, 
              JSON.stringify(completePageData), 
              page.layoutTemplateId || null,
              themeIdToSave,
              page.colorPaletteId || null,
              pageMeta.pageType,
              pageMeta.pagePairId,
              pageMeta.isSpecialPage,
              pageMeta.isLocked,
              pageMeta.isPrintable,
              pageMeta.layoutVariation,
              pageMeta.backgroundVariation,
              pageMeta.backgroundTransform ? JSON.stringify(pageMeta.backgroundTransform) : null,
              page.id, 
              bookId
            ]
          );
          pageId = page.id;
          processedPageIds.add(page.id);
        } else {
          // Always check if a page with this pageNumber already exists for this book
          // Use ABS() to handle cases where page_number might be temporarily negated
          const existingPage = await pool.query(
            'SELECT id FROM public.pages WHERE book_id = $1 AND ABS(page_number) = $2',
            [bookId, page.pageNumber]
          );
          
          let existingPageId = null;
          let shouldUpdateExisting = false;
          if (existingPage.rows.length > 0) {
            existingPageId = existingPage.rows[0].id;
            
            // IMPORTANT: Don't overwrite an existing page if it was already processed
            // This prevents original pages from being overwritten by duplicates
            // that come earlier in the list
            if (processedPageIds.has(existingPageId)) {
              // This page was already processed, so we should use it but not update it
              // This ensures it's added to allPageIds and won't be deleted
              shouldUpdateExisting = false;
            } else {
              // Page exists and hasn't been processed yet, so we can update it
              // This applies to both full saves and partial saves - if a page is in the
              // modified pages list, it should be updated even if it already exists
              shouldUpdateExisting = true;
            }
          }
          
          if (existingPageId && shouldUpdateExisting) {
            // Update existing page instead of inserting
            const pageElements = Array.isArray(page.elements) ? page.elements : (page.elements?.elements || []);
            const pageMeta = normalizePageMetadata(page);
            const completePageData = {
              id: existingPageId,
              elements: pageElements,
              background: page.background || { pageTheme: null },
              pageNumber: page.pageNumber,
              database_id: existingPageId,
              pageType: pageMeta.pageType,
              pagePairId: pageMeta.pagePairId,
              isSpecialPage: pageMeta.isSpecialPage,
              isLocked: pageMeta.isLocked,
              isPrintable: pageMeta.isPrintable,
              layoutVariation: pageMeta.layoutVariation,
              backgroundVariation: pageMeta.backgroundVariation,
              ...(pageMeta.backgroundTransform ? { backgroundTransform: pageMeta.backgroundTransform } : {})
            };

            await pool.query(
              `UPDATE public.pages 
               SET page_number = $1,
                   elements = $2,
                   layout_template_id = $3,
                   theme_id = $4,
                   color_palette_id = $5,
                   page_type = $6,
                   page_pair_id = $7,
                   is_special_page = $8,
                   is_locked = $9,
                   is_printable = $10,
                   layout_variation = $11,
                   background_variation = $12,
                   background_transform = $13
               WHERE id = $14 AND book_id = $15`,
              [
                page.pageNumber, 
                JSON.stringify(completePageData), 
                page.layoutTemplateId || null,
                page.themeId || null,
                page.colorPaletteId || null,
                pageMeta.pageType,
                pageMeta.pagePairId,
                pageMeta.isSpecialPage,
                pageMeta.isLocked,
                pageMeta.isPrintable,
                pageMeta.layoutVariation,
                pageMeta.backgroundVariation,
                pageMeta.backgroundTransform ? JSON.stringify(pageMeta.backgroundTransform) : null,
                existingPageId, 
                bookId
              ]
            );
            pageId = existingPageId;
            processedPageIds.add(existingPageId);
          } else if (existingPageId && !shouldUpdateExisting) {
            // Page exists but should not be updated (already processed or partial save)
            // Just use its ID so it's added to allPageIds and won't be deleted
            pageId = existingPageId;
            // Add to processedPageIds to prevent duplicate processing
            if (!processedPageIds.has(existingPageId)) {
              processedPageIds.add(existingPageId);
            }
          } else {
            // Insert new page
            // But first check if page_number would conflict
            if (existingPageId) {
              // A page with this page_number exists but we can't update it
              // This shouldn't happen, but if it does, we need to skip this page
              continue;
            }
            // Ensure elements is always an array
            const pageElements = Array.isArray(page.elements) ? page.elements : (page.elements?.elements || []);
            const pageMeta = normalizePageMetadata(page);
            const completePageData = {
              elements: pageElements,
              background: page.background || { pageTheme: null },
              pageNumber: page.pageNumber,
              pageType: pageMeta.pageType,
              pagePairId: pageMeta.pagePairId,
              isSpecialPage: pageMeta.isSpecialPage,
              isLocked: pageMeta.isLocked,
              isPrintable: pageMeta.isPrintable,
              layoutVariation: pageMeta.layoutVariation,
              backgroundVariation: pageMeta.backgroundVariation,
              ...(pageMeta.backgroundTransform ? { backgroundTransform: pageMeta.backgroundTransform } : {})
            };
            
            // Only set theme_id if themeId property exists in the page object
            // If themeId doesn't exist, the page inherits the book theme, so set theme_id to null
            const themeIdToInsert = 'themeId' in page ? (page.themeId || null) : null;
            
            const pageResult = await pool.query(
              `INSERT INTO public.pages (
                 book_id,
                 page_number,
                 elements,
                 layout_template_id,
                 theme_id,
                 color_palette_id,
                 page_type,
                 page_pair_id,
                 is_special_page,
                 is_locked,
                 is_printable,
                 layout_variation,
                 background_variation,
                 background_transform
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
              [
                bookId, 
                page.pageNumber, 
                JSON.stringify(completePageData), 
                page.layoutTemplateId || null,
                themeIdToInsert,
                page.colorPaletteId || null,
                pageMeta.pageType,
                pageMeta.pagePairId,
                pageMeta.isSpecialPage,
                pageMeta.isLocked,
                pageMeta.isPrintable,
                pageMeta.layoutVariation,
                pageMeta.backgroundVariation,
                pageMeta.backgroundTransform ? JSON.stringify(pageMeta.backgroundTransform) : null
              ]
            );
            pageId = pageResult.rows[0].id;
            
            // Update with complete structure including database_id
            completePageData.id = pageId;
            completePageData.database_id = pageId;
            
            await pool.query(
              'UPDATE public.pages SET elements = $1 WHERE id = $2',
              [JSON.stringify(completePageData), pageId]
            );
            
            // Add both the original page.id (if it exists) and the new database ID to processedPageIds
            // This ensures that if the page is later referenced by its database ID, it will be recognized
            if (page.id) processedPageIds.add(page.id);
            if (pageId && typeof pageId === 'number' && Number.isInteger(pageId) && pageId > 0 && pageId < 2147483647) {
              processedPageIds.add(pageId);
            }
          }
        }
        
        // Only add valid PostgreSQL INTEGER IDs to allPageIds
        if (pageId && typeof pageId === 'number' && Number.isInteger(pageId) && pageId > 0 && pageId < 2147483647) {
          allPageIds.push(pageId);
        }

        // Debug: Prüfe gespeicherten Zustand nach Update/Insert
        try {
          const storedPage = await pool.query(
            'SELECT id, elements FROM public.pages WHERE id = $1',
            [pageId]
          );
          const storedElements = storedPage.rows[0]?.elements;
          let storedSummary = 'unknown';
          if (Array.isArray(storedElements)) {
            storedSummary = `array length ${storedElements.length}`;
          } else if (storedElements && typeof storedElements === 'object') {
            const length = Array.isArray(storedElements.elements) ? storedElements.elements.length : 'no-elements-field';
            storedSummary = `object elements length ${length}`;
          } else if (typeof storedElements === 'string') {
            try {
              const parsed = JSON.parse(storedElements);
              const length = Array.isArray(parsed) ? parsed.length : Array.isArray(parsed?.elements) ? parsed.elements.length : 'no-elements-field';
              storedSummary = `string parsed length ${length}`;
            } catch (err) {
              storedSummary = `string parse error`;
            }
          } else {
            storedSummary = typeof storedElements;
          }
        } catch (debugError) {
          // Failed to verify stored page elements
        }

        // Remove existing question associations for this page
        await pool.query(
          'DELETE FROM public.question_pages WHERE page_id = $1',
          [pageId]
        );

        // Get assigned user for this page (check React state first, then database)
        let pageAssignment = { rows: [] };
        
        // Check if there's a page assignment in the request data
        const pageAssignmentFromState = req.body.pageAssignments && req.body.pageAssignments[page.pageNumber];
        if (pageAssignmentFromState) {
          pageAssignment = { rows: [{ user_id: pageAssignmentFromState.userId }] };
        } else {
          // Fallback to database
          pageAssignment = await pool.query(
            'SELECT user_id FROM public.page_assignments WHERE page_id = $1',
            [pageId]
          );
        }
        
        // Add new question associations and create answer placeholders
        // Ensure elements is always an array
        const elements = Array.isArray(page.elements) ? page.elements : (page.elements?.elements || []);
        let elementsUpdated = false;
        
        for (const element of elements) {
          // Question or QnA elements have a question on the page (questionId is UUID)
          const hasQuestionOnPage = (element.textType === 'question' || element.textType === 'qna') && element.questionId;
          if (hasQuestionOnPage) {
            const questionExists = await pool.query(
              'SELECT id FROM public.questions WHERE id = $1',
              [element.questionId]
            );
            
            if (questionExists.rows.length > 0) {
              await pool.query(
                'INSERT INTO public.question_pages (question_id, page_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [element.questionId, pageId]
              );
            }
            
            // Create answer placeholder for question (assigned user needs to answer)
            if (pageAssignment.rows.length > 0) {
              const assignedUserId = pageAssignment.rows[0].user_id;
              
              // Check if question exists before creating answer
              const questionExists = await pool.query(
                'SELECT id FROM public.questions WHERE id = $1',
                [element.questionId]
              );
              
              if (questionExists.rows.length > 0) {
                const existingAnswer = await pool.query(
                  'SELECT id FROM public.answers WHERE question_id = $1 AND user_id = $2',
                  [element.questionId, assignedUserId]
                );
                
                if (existingAnswer.rows.length === 0) {
                  await pool.query(
                    'INSERT INTO public.answers (id, question_id, user_id, answer_text) VALUES (uuid_generate_v4(), $1, $2, $3) ON CONFLICT (user_id, question_id) DO NOTHING',
                    [element.questionId, assignedUserId, '']
                  );
                }
              }
            }
          }
          
          // Create answer placeholders for answer elements
          if (element.textType === 'answer' && element.questionId && pageAssignment.rows.length > 0) {
            const assignedUserId = pageAssignment.rows[0].user_id;
            
            // Check if question exists before creating answer
            const questionExists = await pool.query(
              'SELECT id FROM public.questions WHERE id = $1',
              [element.questionId]
            );
            
            if (questionExists.rows.length > 0) {
              const existingAnswer = await pool.query(
                'SELECT id FROM public.answers WHERE question_id = $1 AND user_id = $2',
                [element.questionId, assignedUserId]
              );
              
              if (existingAnswer.rows.length === 0) {
                const newAnswer = await pool.query(
                  'INSERT INTO public.answers (id, question_id, user_id, answer_text) VALUES (uuid_generate_v4(), $1, $2, $3) ON CONFLICT (user_id, question_id) DO UPDATE SET answer_text = EXCLUDED.answer_text RETURNING id',
                  [element.questionId, assignedUserId, '']
                );
                
                element.answerId = newAnswer.rows[0].id;
                elementsUpdated = true;
              } else {
                element.answerId = existingAnswer.rows[0].id;
                elementsUpdated = true;
              }
            }
          }
        }
        
        // Create answer placeholders for all questions on assigned pages
        if (pageAssignment.rows.length > 0) {
          const assignedUserId = pageAssignment.rows[0].user_id;
          const questionElements = elements.filter(el => (el.textType === 'question' || el.textType === 'qna') && el.questionId);
          
          for (const questionElement of questionElements) {
            // Check if question exists before creating answer
            const questionExists = await pool.query(
              'SELECT id FROM public.questions WHERE id = $1',
              [questionElement.questionId]
            );
            
            if (questionExists.rows.length > 0) {
              const existingAnswer = await pool.query(
                'SELECT id FROM public.answers WHERE question_id = $1 AND user_id = $2',
                [questionElement.questionId, assignedUserId]
              );
              
              if (existingAnswer.rows.length === 0) {
                await pool.query(
                  'INSERT INTO public.answers (id, question_id, user_id, answer_text) VALUES (uuid_generate_v4(), $1, $2, $3)',
                  [questionElement.questionId, assignedUserId, '']
                );
              }
            }
          }
        }
        
        // Update page elements if answer IDs were added
        if (elementsUpdated) {
          const pageMeta = normalizePageMetadata(page);
          const updatedPageData = {
            id: pageId,
            elements: elements,
            background: page.background || { pageTheme: null },
            pageNumber: page.pageNumber,
            database_id: pageId,
            pageType: pageMeta.pageType,
            pagePairId: pageMeta.pagePairId,
            isSpecialPage: pageMeta.isSpecialPage,
            isLocked: pageMeta.isLocked,
            isPrintable: pageMeta.isPrintable,
            layoutVariation: pageMeta.layoutVariation,
            backgroundVariation: pageMeta.backgroundVariation,
            ...(pageMeta.backgroundTransform ? { backgroundTransform: pageMeta.backgroundTransform } : {})
          };
          
          await pool.query(
            'UPDATE public.pages SET elements = $1 WHERE id = $2',
            [JSON.stringify(updatedPageData), pageId]
          );
        }
      }
      
      // Delete pages that are no longer in the pages array (only if saving all pages)
      if (!onlyModifiedPages && allPageIds.length > 0) {
        const placeholders = allPageIds.map((_, i) => `$${i + 2}`).join(',');
        await pool.query(
          `DELETE FROM public.pages WHERE book_id = $1 AND id NOT IN (${placeholders})`,
          [bookId, ...allPageIds]
        );
      }
      
      // If only modified pages were sent, restore page numbers for unmodified pages
      if (onlyModifiedPages) {
        // Restore page numbers for pages that weren't in the modified list
        // Filter to only include valid PostgreSQL INTEGER values (max 2147483647)
        const modifiedPageIds = pages
          .map(p => p.id)
          .filter(id => id && typeof id === 'number' && Number.isInteger(id) && id > 0 && id < 2147483647);
        if (modifiedPageIds.length > 0) {
          const placeholders = modifiedPageIds.map((_, i) => `$${i + 2}`).join(',');
          await pool.query(
            `UPDATE public.pages SET page_number = ABS(page_number) WHERE book_id = $1 AND id NOT IN (${placeholders}) AND page_number < 0`,
            [bookId, ...modifiedPageIds]
          );
        }
      } else {
        // If all pages were sent, restore all page numbers from negative values
        // First, restore pages that were temporarily moved (page_number < -10000)
        // These were moved to make room for original pages
        // Formula: original_page_number = ABS(page_number) - 10000
        await pool.query(
          'UPDATE public.pages SET page_number = ABS(page_number) - 10000 WHERE book_id = $1 AND page_number < -10000',
          [bookId]
        );
        // Then restore other pages with negative page numbers
        await pool.query(
          'UPDATE public.pages SET page_number = ABS(page_number) WHERE book_id = $1 AND page_number < 0',
          [bookId]
        );
      }
      
      // After all pages are processed, create answer placeholders for newly assigned users
      if (req.body.pageAssignments) {
        for (const [pageNumber, assignment] of Object.entries(req.body.pageAssignments)) {
          const pageResult = await pool.query(
            'SELECT id FROM public.pages WHERE book_id = $1 AND page_number = $2',
            [bookId, parseInt(pageNumber)]
          );
          
          if (pageResult.rows.length > 0) {
            const pageId = pageResult.rows[0].id;
            const assignedUserId = assignment.userId;
            
          // Get all questions on this page
          const pageData = pages.find(p => p.pageNumber === parseInt(pageNumber));
          if (pageData) {
            // Ensure elements is always an array
            const pageElements = Array.isArray(pageData.elements) ? pageData.elements : (pageData.elements?.elements || []);
            const questionElements = pageElements.filter(el => el.textType === 'question' && el.questionId);
              
              for (const questionElement of questionElements) {
                // Check if question exists before creating answer
                const questionExists = await pool.query(
                  'SELECT id FROM public.questions WHERE id = $1',
                  [questionElement.questionId]
                );
                
                if (questionExists.rows.length > 0) {
                  const existingAnswer = await pool.query(
                    'SELECT id FROM public.answers WHERE question_id = $1 AND user_id = $2',
                    [questionElement.questionId, assignedUserId]
                  );
                  
                  if (existingAnswer.rows.length === 0) {
                    await pool.query(
                      'INSERT INTO public.answers (id, question_id, user_id, answer_text) VALUES (uuid_generate_v4(), $1, $2, $3)',
                      [questionElement.questionId, assignedUserId, '']
                    );
                  }
                }
              }
            }
          }
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  } finally {
    // Always remove the save key when done
    const saveKey = `${req.user.id}-${req.params.id}`;
    ongoingSaves.delete(saveKey);
  }
});

// Create new book
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, pageSize, orientation, bookTheme, layoutTemplateId, themeId, colorPaletteId } = req.body;
    const userId = req.user.id;
    const finalTheme = themeId || bookTheme || 'default';

    const result = await pool.query(
      `INSERT INTO public.books (
        name,
        owner_id,
        page_size,
        orientation,
        layout_template_id,
        theme_id,
        color_palette_id,
        min_pages,
        max_pages,
        page_pairing_enabled,
        special_pages_config,
        layout_strategy,
        layout_random_mode,
        assisted_layouts,
        group_chat_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        name,
        userId,
        pageSize,
        orientation,
        layoutTemplateId || null,
        finalTheme,
        colorPaletteId || null,
        req.body.minPages ?? null,
        req.body.maxPages ?? null,
        req.body.pagePairingEnabled ?? false,
        req.body.specialPagesConfig ? JSON.stringify(req.body.specialPagesConfig) : null,
        req.body.layoutStrategy || null,
        req.body.layoutRandomMode || null,
        req.body.assistedLayouts ? JSON.stringify(req.body.assistedLayouts) : null,
        req.body.groupChatEnabled ?? false,
      ]
    );

    const bookId = result.rows[0].id;

    // Create initial page
    await pool.query(
      `INSERT INTO public.pages (
        book_id,
        page_number,
        elements,
        layout_template_id,
        theme_id,
        color_palette_id,
        page_type,
        page_pair_id,
        is_special_page,
        is_locked,
        is_printable,
        layout_variation,
        background_variation,
        background_transform
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        bookId,
        1,
        JSON.stringify([]),
        null,
        null,
        colorPaletteId || null,
        'content',
        null,
        false,
        false,
        true,
        'normal',
        'normal',
        null
      ]
    );

    // Add owner as publisher collaborator with full permissions
    await pool.query(
      'INSERT INTO public.book_friends (book_id, user_id, book_role, page_access_level, editor_interaction_level) VALUES ($1, $2, $3, $4, $5)',
      [bookId, userId, 'publisher', 'all_pages', 'full_edit_with_settings']
    );

    try {
      await createOrUpdateBookConversation({
        bookId,
        title: name,
        participantIds: [userId],
        metadata: {
          createdBy: userId,
          createdVia: 'book_creation',
        },
      });
    } catch (chatError) {
      // Failed to create messenger chat
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating book:', error);
    console.error('User ID:', req.user?.id);
    console.error('Request body:', req.body);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Archive/Restore book
router.put('/:id/archive', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    // Check if user is owner
    const book = await pool.query('SELECT * FROM public.books WHERE id = $1 AND owner_id = $2', [bookId, userId]);
    if (book.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updateResult = await pool.query(
      'UPDATE public.books SET archived = NOT archived, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING archived',
      [bookId]
    );

    const archived = updateResult.rows[0]?.archived ?? false;

    try {
      await setBookConversationActive(bookId, !archived);
    } catch (chatError) {
      // Failed to update chat state
    }

    res.json({ success: true, archived });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete book permanently
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    // Check if user is owner
    const book = await pool.query('SELECT * FROM public.books WHERE id = $1 AND owner_id = $2', [bookId, userId]);
    if (book.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM public.books WHERE id = $1', [bookId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add collaborator by email
router.post('/:id/collaborators', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { email } = req.body;
    const userId = req.user.id;

    // Check if user is owner
    const book = await pool.query('SELECT * FROM public.books WHERE id = $1 AND owner_id = $2', [bookId, userId]);
    if (book.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Find user by email
    const user = await pool.query('SELECT id, name FROM public.users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const collaboratorId = user.rows[0].id;
    const collaboratorName = user.rows[0].name;

    // Check if user is already a collaborator
    const existingCollaborator = await pool.query(
      'SELECT * FROM public.book_friends WHERE book_id = $1 AND user_id = $2',
      [bookId, collaboratorId]
    );

    if (existingCollaborator.rows.length > 0) {
      return res.status(409).json({ error: 'User is already a collaborator on this book' });
    }

    // Add friendship if it doesn't exist
    await pool.query(
      'INSERT INTO public.friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, collaboratorId]
    );
    await pool.query(
      'INSERT INTO public.friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [collaboratorId, userId]
    );

    // Add collaborator with default permissions
    const result = await pool.query(
      'INSERT INTO public.book_friends (book_id, user_id, book_role, page_access_level, editor_interaction_level) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [bookId, collaboratorId, 'author', 'own_page', 'full_edit']
    );

    try {
      await addUsersToBookConversation({
        bookId,
        bookTitle: book.rows[0]?.name,
        userIds: [collaboratorId],
        metadata: { addedBy: userId },
      });
      await syncGroupChatForBook(bookId);
    } catch (chatError) {
      // Failed to sync collaborator with chat
    }

    res.json({ success: true, collaborator: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add friend to book by friend ID
router.post('/:id/friends', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { friendId, userId: targetUserId, role = 'author', book_role, page_access_level, editor_interaction_level } = req.body;
    const userId = req.user.id;
    const userToAdd = friendId || targetUserId;

    // Check if user has access to manage this book
    const bookAccess = await pool.query(`
      SELECT b.*, bf.book_role as user_book_role FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.book_role = 'publisher')
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Verify the friend relationship exists or create it if it doesn't
    const friendship = await pool.query(
      'SELECT * FROM public.friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [userId, userToAdd]
    );

    if (friendship.rows.length === 0) {
      // Auto-create friendship when adding to book
      await pool.query(
        'INSERT INTO public.friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, userToAdd]
      );
      await pool.query(
        'INSERT INTO public.friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userToAdd, userId]
      );
    }

    // Check if user is already in book_friends
    const existingFriend = await pool.query(
      'SELECT * FROM public.book_friends WHERE book_id = $1 AND user_id = $2',
      [bookId, userToAdd]
    );

    if (existingFriend.rows.length > 0) {
      // Automatically set permissions for publishers
      let finalPageAccessLevel = page_access_level || 'own_page';
      let finalEditorInteractionLevel = editor_interaction_level || 'full_edit';
      
      if ((book_role || role) === 'publisher') {
        finalPageAccessLevel = 'all_pages';
        finalEditorInteractionLevel = 'full_edit_with_settings';
      }
      
      // Update existing friend's permissions instead of returning error
      const result = await pool.query(
        'UPDATE public.book_friends SET book_role = $1, page_access_level = $2, editor_interaction_level = $3 WHERE book_id = $4 AND user_id = $5 RETURNING *',
        [book_role || role, finalPageAccessLevel, finalEditorInteractionLevel, bookId, userToAdd]
      );

      try {
        await addUsersToBookConversation({
          bookId,
          bookTitle: bookAccess.rows[0]?.name,
          userIds: [userToAdd],
          metadata: { addedBy: userId },
        });
        await syncGroupChatForBook(bookId);
      } catch (chatError) {
        // Failed to sync existing friend with chat
      }

      return res.json({ success: true, friend: result.rows[0] });
    }

    // Automatically set permissions for publishers
    let finalPageAccessLevel = page_access_level || 'own_page';
    let finalEditorInteractionLevel = editor_interaction_level || 'full_edit';
    
    if ((book_role || role) === 'publisher') {
      finalPageAccessLevel = 'all_pages';
      finalEditorInteractionLevel = 'full_edit_with_settings';
    }

    // Add friend to book with permissions
    const result = await pool.query(
      'INSERT INTO public.book_friends (book_id, user_id, book_role, page_access_level, editor_interaction_level) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [bookId, userToAdd, book_role || role, finalPageAccessLevel, finalEditorInteractionLevel]
    );

    try {
      await addUsersToBookConversation({
        bookId,
        bookTitle: bookAccess.rows[0]?.name,
        userIds: [userToAdd],
        metadata: { addedBy: userId },
      });
      await syncGroupChatForBook(bookId);
    } catch (chatError) {
      // Failed to sync new friend with chat
    }

    res.json({ success: true, friend: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove collaborator
router.delete('/:id/collaborators/:userId', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const collaboratorId = req.params.userId;
    const userId = req.user.id;

    // Check if user is owner
    const book = await pool.query('SELECT * FROM public.books WHERE id = $1 AND owner_id = $2', [bookId, userId]);
    if (book.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query(
      'DELETE FROM public.book_friends WHERE book_id = $1 AND user_id = $2',
      [bookId, collaboratorId]
    );

    try {
      await removeUsersFromBookConversation(bookId, [collaboratorId]);
    } catch (chatError) {
      // Failed to remove collaborator from chat
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get questions for a book
router.get('/:id/questions', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    // Check if user has access to this book (owner, publisher, or author)
    const bookAccess = await pool.query(`
      SELECT b.* FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const questions = await pool.query(
      'SELECT * FROM public.questions WHERE book_id = $1 ORDER BY created_at ASC',
      [bookId]
    );

    res.json(questions.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get questions with page information
router.get('/:id/questions-with-pages', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    // Check if user has access to this book
    const bookAccess = await pool.query(`
      SELECT b.* FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const questions = await pool.query(`
      SELECT q.*, 
             COALESCE(array_agg(p.page_number) FILTER (WHERE p.page_number IS NOT NULL), '{}') as page_numbers,
             CASE WHEN COUNT(qp.page_id) = 0 THEN 'draft' ELSE 'published' END as status
      FROM public.questions q
      LEFT JOIN public.question_pages qp ON q.id = qp.question_id
      LEFT JOIN public.pages p ON qp.page_id = p.id
      WHERE q.book_id = $1
      GROUP BY q.id
      ORDER BY q.created_at ASC
    `, [bookId]);

    res.json(questions.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create question for a book
router.post('/:id/questions', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { questionText } = req.body;
    const userId = req.user.id;

    // Check if user is owner or publisher
    const bookAccess = await pool.query(`
      SELECT b.*, bf.book_role FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.book_role = 'publisher')
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      'INSERT INTO public.questions (book_id, question_text, created_by) VALUES ($1, $2, $3) RETURNING *',
      [bookId, questionText, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user answers for a book
router.get('/:id/answers', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    // Check if user has access to this book
    const bookAccess = await pool.query(`
      SELECT b.* FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get user's answers for this book
    const answers = await pool.query(`
      SELECT a.* FROM public.answers a
      JOIN public.questions q ON a.question_id = q.id
      WHERE q.book_id = $1 AND a.user_id = $2
    `, [bookId, userId]);

    res.json(answers.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user role and page assignments for a book
router.get('/:id/user-role', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    // Check if user is owner
    const book = await pool.query('SELECT owner_id FROM public.books WHERE id = $1', [bookId]);
    if (book.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (book.rows[0].owner_id === userId) {
      return res.json({ 
        role: 'publisher', 
        assignedPages: [],
        page_access_level: 'all_pages',
        editor_interaction_level: 'full_edit_with_settings'
      });
    }

    // Check if user is collaborator
    const collaborator = await pool.query(
      'SELECT book_role, page_access_level, editor_interaction_level FROM public.book_friends WHERE book_id = $1 AND user_id = $2',
      [bookId, userId]
    );

    if (collaborator.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get assigned pages for authors
    let assignedPages = [];
    if (collaborator.rows[0].book_role === 'author') {
      const assignments = await pool.query(`
        SELECT p.page_number FROM public.page_assignments pa
        JOIN public.pages p ON pa.page_id = p.id
        WHERE p.book_id = $1 AND pa.user_id = $2
      `, [bookId, userId]);
      assignedPages = assignments.rows.map(row => row.page_number);
    }

    res.json({ 
      role: collaborator.rows[0].book_role, 
      assignedPages,
      page_access_level: collaborator.rows[0].page_access_level,
      editor_interaction_level: collaborator.rows[0].editor_interaction_level
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get friends for a book
router.get('/:id/friends', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    // Check if user has access to this book
    const bookAccess = await pool.query(`
      SELECT b.* FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.user_id = $2)
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const friends = await pool.query(`
      SELECT u.id, u.name, u.email, bf.book_role as role, bf.book_role, bf.page_access_level, bf.editor_interaction_level
      FROM public.book_friends bf
      JOIN public.users u ON bf.user_id = u.id
      WHERE bf.book_id = $1 AND bf.user_id != $2
      ORDER BY u.name ASC
    `, [bookId, userId]);
    
    const friendsWithCorrectFields = friends.rows.map(friend => ({
      ...friend,
      pageAccessLevel: friend.page_access_level,
      editorInteractionLevel: friend.editor_interaction_level
    }));

    res.json(friendsWithCorrectFields);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update friend role
router.put('/:id/friends/:friendId/role', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const friendId = req.params.friendId;
    const { role, book_role, page_access_level, editor_interaction_level } = req.body;
    const userId = req.user.id;

    // Check if user is owner or publisher
    const bookAccess = await pool.query(`
      SELECT b.*, bf.book_role as user_book_role FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.book_role = 'publisher')
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Automatically set permissions for publishers
    let finalPageAccessLevel = page_access_level;
    let finalEditorInteractionLevel = editor_interaction_level;
    
    if ((book_role || role) === 'publisher') {
      finalPageAccessLevel = 'all_pages';
      finalEditorInteractionLevel = 'full_edit_with_settings';
    }
    
    await pool.query(
      'UPDATE public.book_friends SET book_role = $1, page_access_level = $2, editor_interaction_level = $3 WHERE book_id = $4 AND user_id = $5',
      [book_role || role, finalPageAccessLevel, finalEditorInteractionLevel, bookId, friendId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk update book friends permissions
router.put('/:id/friends/bulk-update', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { friends } = req.body;
    const userId = req.user.id;

    // Check if user is owner or publisher
    const bookAccess = await pool.query(`
      SELECT b.*, bf.book_role as user_book_role FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.book_role = 'publisher')
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update each friend's permissions
    for (const friend of friends) {
      // Automatically set permissions for publishers
      let finalPageAccessLevel = friend.page_access_level;
      let finalEditorInteractionLevel = friend.editor_interaction_level;
      
      if (friend.book_role === 'publisher') {
        finalPageAccessLevel = 'all_pages';
        finalEditorInteractionLevel = 'full_edit_with_settings';
      }
      
      const result = await pool.query(
        'UPDATE public.book_friends SET book_role = $1, page_access_level = $2, editor_interaction_level = $3 WHERE book_id = $4 AND user_id = $5 RETURNING *',
        [friend.book_role, finalPageAccessLevel, finalEditorInteractionLevel, bookId, friend.user_id]
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove friend from book
router.delete('/:id/friends/:friendId', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const friendId = req.params.friendId;
    const userId = req.user.id;

    // Check if user is owner or publisher
    const bookAccess = await pool.query(`
      SELECT b.*, bf.book_role as user_book_role FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.book_role = 'publisher')
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Remove page assignments first
    await pool.query(`
      DELETE FROM public.page_assignments 
      WHERE page_id IN (SELECT id FROM public.pages WHERE book_id = $1) AND user_id = $2
    `, [bookId, friendId]);

    // Remove from book_friends
    await pool.query(
      'DELETE FROM public.book_friends WHERE book_id = $1 AND user_id = $2',
      [bookId, friendId]
    );

    try {
      await removeUsersFromBookConversation(bookId, [friendId]);
    } catch (chatError) {
      // Failed to remove friend from chat
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update page order
router.put('/:id/page-order', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { pageOrder } = req.body;
    const userId = req.user.id;

    // Check if user is owner or publisher
    const bookAccess = await pool.query(`
      SELECT b.*, bf.book_role as user_book_role FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $2
      WHERE b.id = $1 AND (b.owner_id = $2 OR bf.book_role = 'publisher')
    `, [bookId, userId]);

    if (bookAccess.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // First, set all page numbers to negative values to avoid conflicts
    await pool.query(
      'UPDATE public.pages SET page_number = -page_number WHERE book_id = $1',
      [bookId]
    );
    
    // Then update to new page numbers based on order
    for (let i = 0; i < pageOrder.length; i++) {
      const newPageNumber = i + 1;
      const oldPageNumber = pageOrder[i];
      
      await pool.query(
        'UPDATE public.pages SET page_number = $1 WHERE book_id = $2 AND page_number = $3',
        [newPageNumber, bookId, -oldPageNumber]
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
