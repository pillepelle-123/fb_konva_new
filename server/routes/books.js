const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

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
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all books (non-archived)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const books = await pool.query(`
      SELECT DISTINCT b.id, b.name, b.page_size, b.orientation, b.owner_id, b.created_at, b.updated_at,
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
        updated_at: book.updated_at
      };
    }));
  } catch (error) {
    console.error('Books fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get archived books
router.get('/archived', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const books = await pool.query(`
      SELECT DISTINCT b.id, b.name, b.page_size, b.orientation, b.owner_id, b.created_at, bf.book_role
      FROM public.books b
      LEFT JOIN public.book_friends bf ON b.id = bf.book_id AND bf.user_id = $1
      WHERE (b.owner_id = $1 OR bf.user_id = $1) AND b.archived = TRUE
      ORDER BY b.created_at DESC
    `, [userId]);

    res.json(books.rows.map(book => {
      const isOwner = book.owner_id === userId;
      const userRole = isOwner ? 'owner' : book.book_role;
      
      return {
        id: book.id,
        name: book.name,
        pageSize: book.page_size,
        orientation: book.orientation,
        isOwner: isOwner,
        userRole: userRole,
        createdAt: book.created_at
      };
    }));
  } catch (error) {
    console.error('Archived books fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single book with pages
router.get('/:id', authenticateToken, async (req, res) => {
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

    const book = bookAccess.rows[0];

    // Get pages for this book
    const pages = await pool.query(
      'SELECT * FROM public.pages WHERE book_id = $1 ORDER BY page_number ASC',
      [bookId]
    );
    
    // Get all answers for this book to populate canvas elements
    const allAnswers = await pool.query(`
      SELECT a.* FROM public.answers a
      JOIN public.questions q ON a.question_id = q.id
      WHERE q.book_id = $1
    `, [bookId]);
    
    // Get user-specific answers for the current user
    const userAnswers = await pool.query(`
      SELECT a.* FROM public.answers a
      JOIN public.questions q ON a.question_id = q.id
      WHERE q.book_id = $1 AND a.user_id = $2
    `, [bookId, userId]);

    // Get questions and answers for this book
    const questions = await pool.query(
      'SELECT * FROM public.questions WHERE book_id = $1',
      [bookId]
    );

    const answers = await pool.query(`
      SELECT a.* FROM public.answers a
      JOIN public.questions q ON a.question_id = q.id
      WHERE q.book_id = $1 AND a.user_id = $2
    `, [bookId, userId]);

    // Get page assignments for this book
    const pageAssignments = await pool.query(`
      SELECT pa.page_id, pa.user_id, p.page_number, u.name, u.email, u.role
      FROM public.page_assignments pa
      JOIN public.pages p ON pa.page_id = p.id
      JOIN public.users u ON pa.user_id = u.id
      WHERE p.book_id = $1
    `, [bookId]);

    // Get user role and permissions for this book
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

    res.json({
      id: book.id,
      name: book.name,
      pageSize: book.page_size,
      orientation: book.orientation,
      owner_id: book.owner_id,
      bookTheme: book.book_theme,
      questions: questions.rows,
      answers: answers.rows,
      pageAssignments: pageAssignments.rows,
      userRole: userRole,
      pages: pages.rows.map(page => {
        const pageData = page.elements || {};
        const elements = pageData.elements || [];
      //console.log(`Page ${page.id} has ${elements.length} elements`);
        
        // Update answer elements with actual answer text from assigned users
        const updatedElements = elements.map(element => {
        //console.log(`Element type: ${element.textType}, questionId: ${element.questionId}`);
          if (element.textType === 'answer') {
            // Find the user assigned to this page
            const pageAssignment = pageAssignments.rows.find(pa => pa.page_id === page.id);
          //console.log(`Page ${page.id}: assignment found:`, pageAssignment);
            if (pageAssignment) {
              // If answer element has no questionId, find question on same page
              let questionId = element.questionId;
              if (!questionId) {
                const questionElement = elements.find(el => el.textType === 'question' && el.questionId);
                if (questionElement) {
                  questionId = questionElement.questionId;
                  // console.log(`Found question ${questionId} for answer element`);
                }
              }
              
              if (questionId) {
                // Find the answer from the assigned user
                const assignedUserAnswer = allAnswers.rows.find(a => 
                  a.question_id === questionId && a.user_id === pageAssignment.user_id
                );
              //console.log(`Answer found for question ${questionId}:`, assignedUserAnswer);
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
            pageTheme: page.page_theme
          }
        };
      })
    });
  } catch (error) {
    console.error('Book fetch error:', error);
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
          const completePageData = {
            id: pageId,
            elements: page.elements || [],
            background: page.background || { pageTheme: null },
            pageNumber: page.pageNumber,
            database_id: pageId
          };
          
          await pool.query(
            'UPDATE public.pages SET elements = $1, page_theme = $2 WHERE id = $3',
            [JSON.stringify(completePageData), page.background?.pageTheme, pageId]
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
          const elements = page.elements || [];
          let elementsUpdated = false;
          
          for (const element of elements) {
            if (element.textType === 'question' && element.questionId && element.questionId > 0) {
              // Check if question exists before creating association
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
            
            // Create answer placeholders for answer elements
            if (element.textType === 'answer' && element.questionId && element.questionId > 0 && pageAssignment.rows.length > 0) {
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
              } else {
                console.log(`Skipping answer creation for non-existent question: ${element.questionId}`);
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
    console.error('Author save error:', error);
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
    const { name, pageSize, orientation, pages } = req.body;
    
    // Prevent duplicate save operations
    const saveKey = `${userId}-${bookId}`;
    if (ongoingSaves.has(saveKey)) {
      // console.log(`Duplicate save request detected for user ${userId}, book ${bookId} - ignoring`);
      return res.status(409).json({ error: 'Save already in progress' });
    }
    
    ongoingSaves.add(saveKey);
    // console.log(`Starting save operation for user ${userId}, book ${bookId}`);

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
      await pool.query(
        'UPDATE public.books SET name = $1, page_size = $2, orientation = $3, book_theme = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
        [name, pageSize, orientation, req.body.bookTheme || 'default', bookId]
      );

      // UPSERT pages: update existing, insert new
      // console.log(`Processing ${pages.length} pages for book ${bookId}`);
      const processedPageIds = new Set(); // Track processed pages to avoid duplicates
      const processedPageNumbers = new Set(); // Track processed page numbers to avoid duplicates
      const allPageIds = []; // Track all page IDs (existing + new)
      
      for (const page of pages) {
        // console.log(`Processing page: ID=${page.id}, pageNumber=${page.pageNumber}`);
        let pageId;
        
        // Skip if we've already processed this page (efficiency fix)
        if (page.id && processedPageIds.has(page.id)) {
          continue;
        }
        
        // Skip if we've already processed this page number (prevents unique constraint violation)
        if (processedPageNumbers.has(page.pageNumber)) {
          continue;
        }
        
        processedPageNumbers.add(page.pageNumber);
        
        if (page.id && typeof page.id === 'number' && Number.isInteger(page.id) && page.id > 0 && page.id < 2147483647) {
          // Update existing page - store complete page structure
          const completePageData = {
            id: page.id,
            elements: page.elements || [],
            background: page.background || { pageTheme: null },
            pageNumber: page.pageNumber,
            database_id: page.id
          };
          
          await pool.query(
            'UPDATE public.pages SET page_number = $1, elements = $2, page_theme = $3 WHERE id = $4 AND book_id = $5',
            [page.pageNumber, JSON.stringify(completePageData), page.background?.pageTheme, page.id, bookId]
          );
          pageId = page.id;
          processedPageIds.add(page.id);
        } else {
          // Insert new page (UUID/timestamp IDs are treated as new pages)
          // console.log(`Inserting new page with temp ID ${page.id} for book ${bookId}`);
          try {
            // Create complete page structure for new pages
            const completePageData = {
              elements: page.elements || [],
              background: page.background || { pageTheme: null },
              pageNumber: page.pageNumber
            };
            
            const pageResult = await pool.query(
              'INSERT INTO public.pages (book_id, page_number, elements, page_theme) VALUES ($1, $2, $3, $4) RETURNING id',
              [bookId, page.pageNumber, JSON.stringify(completePageData), page.background?.pageTheme]
            );
            pageId = pageResult.rows[0].id;
            
            // Update the inserted page with complete structure including database_id
            completePageData.id = pageId;
            completePageData.database_id = pageId;
            
            await pool.query(
              'UPDATE public.pages SET elements = $1 WHERE id = $2',
              [JSON.stringify(completePageData), pageId]
            );
            
            // console.log(`New page inserted with database ID ${pageId}`);
          } catch (insertError) {
            if (insertError.code === '23505') { // Unique constraint violation
              // Find existing page with this page number and use its ID
              const existingPage = await pool.query(
                'SELECT id FROM public.pages WHERE book_id = $1 AND page_number = $2',
                [bookId, page.pageNumber]
              );
              if (existingPage.rows.length > 0) {
                pageId = existingPage.rows[0].id;
                
                // Update existing page with complete structure
                const completePageData = {
                  id: pageId,
                  elements: page.elements || [],
                  background: page.background || { pageTheme: null },
                  pageNumber: page.pageNumber,
                  database_id: pageId
                };
                
                await pool.query(
                  'UPDATE public.pages SET elements = $1, page_theme = $2 WHERE id = $3',
                  [JSON.stringify(completePageData), page.background?.pageTheme, pageId]
                );
                
                // console.log(`Using existing page ID ${pageId} for page number ${page.pageNumber}`);
              } else {
                throw insertError; // Re-throw if we can't find the existing page
              }
            } else {
              throw insertError; // Re-throw other errors
            }
          }
          if (page.id) processedPageIds.add(page.id); // Track temp ID to avoid duplicates
        }
        
        if (pageId) allPageIds.push(pageId); // Track all page IDs (only if pageId is valid)

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
        //console.log(`Using page assignment from state: user ${pageAssignmentFromState.userId}`);
        } else {
          // Fallback to database
          pageAssignment = await pool.query(
            'SELECT user_id FROM public.page_assignments WHERE page_id = $1',
            [pageId]
          );
        //console.log(`Using page assignment from database:`, pageAssignment.rows);
        }
        
        // Add new question associations and create answer placeholders
        const elements = page.elements || [];
        let elementsUpdated = false;
        
      //console.log(`Processing ${elements.length} elements for page ${pageId}`);
        
        for (const element of elements) {
        //console.log(`Element: type=${element.textType}, questionId=${element.questionId}`);
          
          if (element.textType === 'question' && element.questionId) {
            // Check if question exists before creating association
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
            //console.log(`Creating answer placeholder for question ${element.questionId}, user ${assignedUserId}`);
              
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
                //console.log(`Created answer placeholder for question ${element.questionId}`);
                } else {
                //console.log(`Answer already exists for question ${element.questionId}`);
                }
              } else {
                console.log(`Skipping answer creation for non-existent question: ${element.questionId}`);
              }
            }
          }
          
          // Create answer placeholders for answer elements
          if (element.textType === 'answer' && element.questionId && pageAssignment.rows.length > 0) {
          //console.log(`Processing answer element with questionId: ${element.questionId}`);
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
              //console.log(`Created answer with ID: ${newAnswer.rows[0].id}`);
              } else {
                element.answerId = existingAnswer.rows[0].id;
                elementsUpdated = true;
              //console.log(`Using existing answer ID: ${existingAnswer.rows[0].id}`);
              }
            } else {
              console.log(`Skipping answer element for non-existent question: ${element.questionId}`);
            }
          }
        }
        
        // Create answer placeholders for all questions on assigned pages
        if (pageAssignment.rows.length > 0) {
          const assignedUserId = pageAssignment.rows[0].user_id;
          const questionElements = elements.filter(el => el.textType === 'question' && el.questionId);
          
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
              //console.log(`Created answer placeholder for question ${questionElement.questionId}, user ${assignedUserId}`);
              }
            } else {
              console.log(`Skipping answer placeholder for non-existent question: ${questionElement.questionId}`);
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
      
      // Delete pages that are no longer in the pages array
      if (allPageIds.length > 0) {
        const placeholders = allPageIds.map((_, i) => `$${i + 2}`).join(',');
        // console.log(`Preserving all pages: ${allPageIds.join(', ')}`);
        await pool.query(
          `DELETE FROM public.pages WHERE book_id = $1 AND id NOT IN (${placeholders})`,
          [bookId, ...allPageIds]
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
            if (pageData && pageData.elements) {
              const questionElements = pageData.elements.filter(el => el.textType === 'question' && el.questionId);
              
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
                  //console.log(`Created answer placeholder for reassigned page: question ${questionElement.questionId}, user ${assignedUserId}`);
                  }
                } else {
                  console.log(`Skipping answer placeholder for non-existent question in reassignment: ${questionElement.questionId}`);
                }
              }
            }
          }
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Book update error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    // Always remove the save key when done
    const saveKey = `${req.user.id}-${req.params.id}`;
    ongoingSaves.delete(saveKey);
    // console.log(`Completed save operation for user ${req.user.id}, book ${req.params.id}`);
  }
});

// Create new book
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, pageSize, orientation, bookTheme } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      'INSERT INTO public.books (name, owner_id, page_size, orientation, book_theme) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, userId, pageSize, orientation, bookTheme || 'default']
    );

    const bookId = result.rows[0].id;

    // Create initial page
    await pool.query(
      'INSERT INTO public.pages (book_id, page_number, elements, page_theme) VALUES ($1, $2, $3, $4)',
      [bookId, 1, JSON.stringify([]), null]
    );

    // Add owner as owner collaborator with full permissions
    await pool.query(
      'INSERT INTO public.book_friends (book_id, user_id, book_role, page_access_level, editor_interaction_level) VALUES ($1, $2, $3, $4, $5)',
      [bookId, userId, 'owner', 'all_pages', 'full_edit_with_settings']
    );

    // console.log(`Created book ${bookId} and added owner ${userId} to book_friends`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Book creation error:', error);
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

    await pool.query(
      'UPDATE public.books SET archived = NOT archived, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [bookId]
    );

    res.json({ success: true });
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

    // console.log('Adding collaborator by email:', { bookId, email });

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

    // console.log('Collaborator added successfully:', { collaboratorName, result: result.rows[0] });
    res.json({ success: true, collaborator: result.rows[0] });
  } catch (error) {
    console.error('Add collaborator error:', error);
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

    // console.log('Adding friend to book:', { bookId, userToAdd, role: book_role || role, page_access_level, editor_interaction_level });

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
      // console.log(`Auto-created friendship between ${userId} and ${userToAdd}`);
    }

    // Check if user is already in book_friends
    const existingFriend = await pool.query(
      'SELECT * FROM public.book_friends WHERE book_id = $1 AND user_id = $2',
      [bookId, userToAdd]
    );

    if (existingFriend.rows.length > 0) {
      // Update existing friend's permissions instead of returning error
      const result = await pool.query(
        'UPDATE public.book_friends SET book_role = $1, page_access_level = $2, editor_interaction_level = $3 WHERE book_id = $4 AND user_id = $5 RETURNING *',
        [book_role || role, page_access_level || 'own_page', editor_interaction_level || 'full_edit', bookId, userToAdd]
      );
      // console.log('Friend permissions updated:', result.rows[0]);
      return res.json({ success: true, friend: result.rows[0] });
    }

    // Add friend to book with permissions
    const result = await pool.query(
      'INSERT INTO public.book_friends (book_id, user_id, book_role, page_access_level, editor_interaction_level) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [bookId, userToAdd, book_role || role, page_access_level || 'own_page', editor_interaction_level || 'full_edit']
    );

    // console.log('Friend added successfully:', result.rows[0]);
    res.json({ success: true, friend: result.rows[0] });
  } catch (error) {
    console.error('Add friend to book error:', error);
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
    console.error('Questions fetch error:', error);
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
    console.error('Questions with pages fetch error:', error);
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
    console.error('Question create error:', error);
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
    console.error('User role fetch error:', error);
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

    // console.log(`Found ${friendsWithCorrectFields.length} friends for book ${bookId}:`, friendsWithCorrectFields);
    res.json(friendsWithCorrectFields);
  } catch (error) {
    console.error('Friends fetch error:', error);
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

    await pool.query(
      'UPDATE public.book_friends SET book_role = $1, page_access_level = $2, editor_interaction_level = $3 WHERE book_id = $4 AND user_id = $5',
      [book_role || role, page_access_level, editor_interaction_level, bookId, friendId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk update book friends permissions
router.put('/:id/friends/bulk-update', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { friends } = req.body;
    const userId = req.user.id;

    // console.log('Bulk updating book friends:', { bookId, friendsCount: friends.length, friends });

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
      // console.log('Updating friend:', friend);
      const result = await pool.query(
        'UPDATE public.book_friends SET book_role = $1, page_access_level = $2, editor_interaction_level = $3 WHERE book_id = $4 AND user_id = $5 RETURNING *',
        [friend.book_role, friend.page_access_level, friend.editor_interaction_level, bookId, friend.user_id]
      );
      // console.log('Update result:', result.rows[0]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Bulk permissions update error:', error);
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

    res.json({ success: true });
  } catch (error) {
    console.error('Friend removal error:', error);
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
    console.error('Page order update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
