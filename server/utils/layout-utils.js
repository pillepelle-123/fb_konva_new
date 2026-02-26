/**
 * Parses layoutId for database storage. The client may send "7__mirrored" for mirrored layouts,
 * but layout_id in the DB must be an integer. Extracts the numeric part (e.g. "7__mirrored" → 7).
 * layout_variation stores the mirrored state separately.
 */
function parseLayoutIdForDb(layoutId) {
  if (layoutId === null || layoutId === undefined) {
    return null;
  }
  if (typeof layoutId === 'number' && Number.isInteger(layoutId)) {
    return layoutId;
  }
  const str = String(layoutId);
  if (str.includes('__mirrored')) {
    const numPart = str.replace(/__mirrored$/, '');
    const parsed = parseInt(numPart, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  const parsed = parseInt(str, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Formats layout_id + layout_variation for API response. When layout_variation is 'mirrored',
 * returns "7__mirrored" so the client can resolve the correct template.
 */
function formatLayoutIdForResponse(layoutId, layoutVariation) {
  if (layoutId === null || layoutId === undefined) return null;
  if (layoutVariation === 'mirrored') {
    return `${layoutId}__mirrored`;
  }
  return layoutId;
}

module.exports = {
  parseLayoutIdForDb,
  formatLayoutIdForResponse
};
