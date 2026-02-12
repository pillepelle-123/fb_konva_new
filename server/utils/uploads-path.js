const path = require('path');

/**
 * Get the base uploads directory path.
 * Prioritizes UPLOADS_DIR environment variable, falls back to root/uploads
 * @returns {string} Absolute path to uploads directory
 */
function getUploadsDir() {
  return process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');
}

/**
 * Get a subdirectory path within the uploads directory.
 * @param {string} subdir - Subdirectory name (e.g., 'background-images', 'stickers')
 * @returns {string} Absolute path to the subdirectory
 */
function getUploadsSubdir(subdir) {
  return path.join(getUploadsDir(), subdir);
}

/**
 * Path-Traversal-Schutz: Prüft ob der aufgelöste Pfad innerhalb des Uploads-Verzeichnisses liegt.
 * @param {string} fullPath - Aufgelöster absoluter Pfad
 * @returns {boolean} true wenn sicher
 */
function isPathWithinUploads(fullPath) {
  const uploadsDir = path.resolve(getUploadsDir());
  const resolved = path.resolve(fullPath);
  const relative = path.relative(uploadsDir, resolved);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

module.exports = {
  getUploadsDir,
  getUploadsSubdir,
  isPathWithinUploads,
};
