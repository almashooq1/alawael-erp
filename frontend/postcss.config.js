// Tailwind 4 moved the PostCSS plugin into `@tailwindcss/postcss`.
// Use the new package when it's installed (tailwind 4+), fall back to
// the inline plugin when on tailwind 3.
let tailwindPlugin = 'tailwindcss';
try {
  require.resolve('@tailwindcss/postcss');
  tailwindPlugin = '@tailwindcss/postcss';
} catch {
  /* @tailwindcss/postcss not installed → still on tailwind 3 */
}

module.exports = {
  plugins: {
    [tailwindPlugin]: {},
    autoprefixer: {},
  },
};
