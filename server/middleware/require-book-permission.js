/**
 * Middleware to require a specific permission on the current book.
 * Must run after loadBookPermissionsMiddleware (or equivalent that sets req.bookAbility).
 */

/**
 * @param {string} action - CASL action: 'view' | 'edit' | 'create' | 'delete' | 'manage' | 'use'
 * @param {string} subject - CASL subject: 'Page' | 'Element' | 'Book' | 'BookFriends' | 'Questions' | 'PageAssignments' | 'all' | etc.
 */
function requireBookPermission(action, subject) {
  return (req, res, next) => {
    const ability = req.bookAbility;
    if (!ability) {
      return res.status(500).json({
        error: 'Book permissions not loaded. Ensure loadBookPermissionsMiddleware runs first.',
      });
    }

    if (ability.can(action, subject)) {
      return next();
    }

    return res.status(403).json({ error: 'Forbidden' });
  };
}

module.exports = { requireBookPermission };
