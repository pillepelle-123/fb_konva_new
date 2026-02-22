/**
 * Loads book permissions for a user from the database.
 * Returns data suitable for buildAbilityFor.
 */

/**
 * @param {import('pg').Pool} pool
 * @param {string|number} bookId
 * @param {number} userId
 * @returns {Promise<{ bookRole: string; pageAccessLevel: string; editorInteractionLevel: string; assignedPages: number[]; hasAccess: boolean }|null>}
 */
async function loadBookPermissions(pool, bookId, userId) {
  const bookResult = await pool.query(
    'SELECT owner_id FROM public.books WHERE id = $1',
    [bookId]
  );

  if (bookResult.rows.length === 0) {
    return null;
  }

  const isOwner = bookResult.rows[0].owner_id === userId;

  if (isOwner) {
    return {
      bookRole: 'owner',
      pageAccessLevel: 'all_pages',
      editorInteractionLevel: 'full_edit_with_settings',
      assignedPages: [],
      hasAccess: true,
    };
  }

  const collaborator = await pool.query(
    `SELECT book_role, page_access_level, editor_interaction_level 
     FROM public.book_friends 
     WHERE book_id = $1 AND user_id = $2`,
    [bookId, userId]
  );

  if (collaborator.rows.length === 0) {
    return { hasAccess: false };
  }

  const row = collaborator.rows[0];
  let assignedPages = [];

  if (row.book_role === 'author') {
    const assignments = await pool.query(
      `SELECT p.page_number FROM public.page_assignments pa
       JOIN public.pages p ON pa.page_id = p.id
       WHERE p.book_id = $1 AND pa.user_id = $2`,
      [bookId, userId]
    );
    assignedPages = assignments.rows.map((r) => r.page_number);
  }

  return {
    bookRole: row.book_role,
    pageAccessLevel: row.page_access_level || 'own_page',
    editorInteractionLevel: row.editor_interaction_level || 'full_edit',
    assignedPages,
    hasAccess: true,
  };
}

module.exports = { loadBookPermissions };
