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

module.exports = {
  getUploadsDir,
  getUploadsSubdir,
};
