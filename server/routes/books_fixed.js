// Sync answers from database to canvas elements
router.post('/:id/sync-answers', authenticateToken, async (req, res) => {
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

    // Get all answers for this user and book
    const answers = await pool.query(`
      SELECT a.*, q.id as question_id FROM public.answers a
      JOIN public.questions q ON a.question_id = q.id
      WHERE q.book_id = $1 AND a.user_id = $2
    `, [bookId, userId]);

    // Get all pages for this book
    const pages = await pool.query(
      'SELECT * FROM public.pages WHERE book_id = $1 ORDER BY page_number ASC',
      [bookId]
    );

    // Update canvas elements with answer text
    for (const page of pages.rows) {
      const pageData = page.elements || {};
      const elements = pageData.elements || [];
      let updated = false;

      for (const element of elements) {
        if (element.textType === 'answer' && element.answerId) {
          // Find the answer for this element
          const answer = answers.rows.find(a => a.id === element.answerId);
          if (answer) {
            element.text = answer.answer_text;
            element.formattedText = answer.answer_text;
            updated = true;
          }
        }
      }

      // Update page if any elements were modified
      if (updated) {
        await pool.query(
          'UPDATE public.pages SET elements = $1 WHERE id = $2',
          [JSON.stringify(pageData), page.id]
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Sync answers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});