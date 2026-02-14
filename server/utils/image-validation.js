/**
 * Magic bytes (file signatures) for image validation - prevents spoofed MIME types.
 * Shared between images upload and profile picture upload.
 */
const IMAGE_SIGNATURES = [
  { ext: 'jpg', pattern: [0xFF, 0xD8, 0xFF] },
  { ext: 'png', pattern: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { ext: 'gif', pattern: [0x47, 0x49, 0x46, 0x38] },
  { ext: 'webp', pattern: [0x52, 0x49, 0x46, 0x46], offset: 8, suffix: [0x57, 0x45, 0x42, 0x50] }
];

function validateImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) return { valid: false, ext: null };
  const arr = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  for (const sig of IMAGE_SIGNATURES) {
    if (arr.length < sig.pattern.length) continue;
    const matches = sig.pattern.every((b, i) => arr[i] === b);
    if (matches) {
      if (sig.suffix) {
        const suffixMatches = sig.suffix.every((b, i) => arr[sig.offset + i] === b);
        if (!suffixMatches) continue;
      }
      return { valid: true, ext: sig.ext };
    }
  }
  return { valid: false, ext: null };
}

module.exports = { validateImageMagicBytes, IMAGE_SIGNATURES };
