/**
 * Placeholder Image Generator
 * مولد صور بديلة محلية
 *
 * Generates SVG data URIs as placeholder images.
 * Replaces external via.placeholder.com dependency.
 *
 * @param {string} text - Display text
 * @param {string} bgColor - Background hex color (without #)
 * @param {string} textColor - Text hex color (without #)
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 * @returns {string} SVG data URI
 */
export const placeholderImage = (
  text = '',
  bgColor = '667eea',
  textColor = 'ffffff',
  width = 300,
  height = 400
) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#${bgColor}"/>
    <text x="50%" y="50%" font-family="Arial,sans-serif" font-size="24" fill="#${textColor}" text-anchor="middle" dy=".3em">${text}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
