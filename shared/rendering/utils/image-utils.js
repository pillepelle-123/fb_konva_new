/**
 * Image utility functions for PDF rendering
 */

/**
 * Calculate crop properties for an image to fit within a size without distortion
 * Based on: https://konvajs.org/docs/sandbox/Scale_Image_To_Fit.html
 * @param {HTMLImageElement|Object} image - Image element with width and height properties
 * @param {Object} size - Target size { width, height }
 * @param {string} clipPosition - Clip position (e.g., 'center-middle', 'left-top')
 * @returns {Object} Crop result { cropX, cropY, cropWidth, cropHeight }
 */
function getCrop(image, size, clipPosition = 'center-middle') {
  const width = size.width;
  const height = size.height;
  const aspectRatio = width / height;

  let newWidth;
  let newHeight;

  const imageWidth = image.width || image.naturalWidth || 0;
  const imageHeight = image.height || image.naturalHeight || 0;
  const imageRatio = imageWidth / imageHeight;

  if (aspectRatio >= imageRatio) {
    // Container is wider than image (relatively)
    newWidth = imageWidth;
    newHeight = imageWidth / aspectRatio;
  } else {
    // Container is taller than image (relatively)
    newWidth = imageHeight * aspectRatio;
    newHeight = imageHeight;
  }

  let x = 0;
  let y = 0;

  switch (clipPosition) {
    case 'left-top':
      x = 0;
      y = 0;
      break;
    case 'left-middle':
      x = 0;
      y = (imageHeight - newHeight) / 2;
      break;
    case 'left-bottom':
      x = 0;
      y = imageHeight - newHeight;
      break;
    case 'center-top':
      x = (imageWidth - newWidth) / 2;
      y = 0;
      break;
    case 'center-middle':
      x = (imageWidth - newWidth) / 2;
      y = (imageHeight - newHeight) / 2;
      break;
    case 'center-bottom':
      x = (imageWidth - newWidth) / 2;
      y = imageHeight - newHeight;
      break;
    case 'right-top':
      x = imageWidth - newWidth;
      y = 0;
      break;
    case 'right-middle':
      x = imageWidth - newWidth;
      y = (imageHeight - newHeight) / 2;
      break;
    case 'right-bottom':
      x = imageWidth - newWidth;
      y = imageHeight - newHeight;
      break;
    default:
      x = (imageWidth - newWidth) / 2;
      y = (imageHeight - newHeight) / 2;
  }

  return {
    cropX: x,
    cropY: y,
    cropWidth: newWidth,
    cropHeight: newHeight
  };
}

module.exports = {
  getCrop
};









