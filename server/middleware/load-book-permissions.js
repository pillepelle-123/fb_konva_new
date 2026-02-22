/**
 * Middleware to load book permissions for the current user.
 * Sets req.bookPermissions, req.bookRole, and req.bookAbility.
 * Must run after authenticateToken.
 */

const { loadBookPermissions } = require('../services/load-book-permissions');
const { buildAbilityFor } = require('../services/ability-builder');

/**
 * @param {import('pg').Pool} pool
 * @param {{ bookIdParam?: string; bookIdBodyKey?: string }} [options]
 *   - bookIdParam: param name for bookId (e.g. 'id' for /:id, 'bookId' for /:bookId)
 *   - bookIdBodyKey: body key for bookId (e.g. 'bookId' for POST with body)
 */
function createLoadBookPermissionsMiddleware(pool, options = {}) {
  const bookIdParam = options.bookIdParam || 'id';
  const bookIdBodyKey = options.bookIdBodyKey;

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const bookId = req.params[bookIdParam] ?? (bookIdBodyKey ? req.body?.[bookIdBodyKey] : undefined);
    if (!bookId) {
      return res.status(400).json({ error: 'Book ID required' });
    }

    try {
      const permissions = await loadBookPermissions(pool, bookId, req.user.id);

      if (!permissions) {
        return res.status(404).json({ error: 'Book not found' });
      }

      if (!permissions.hasAccess) {
        return res.status(403).json({ error: 'Not authorized to access this book' });
      }

      req.bookPermissions = permissions;
      req.bookRole = permissions.bookRole;

      const ability = buildAbilityFor(
        req.user.id,
        permissions.bookRole,
        permissions.pageAccessLevel,
        permissions.editorInteractionLevel,
        permissions.assignedPages || []
      );
      req.bookAbility = ability;

      next();
    } catch (err) {
      console.error('loadBookPermissions error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  };
}

module.exports = { createLoadBookPermissionsMiddleware };
