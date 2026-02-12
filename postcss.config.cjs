const plugins = []
try {
  // Optional: Tailwind (may not be installed yet)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  plugins.push(require('tailwindcss'))
} catch (_) {}

try {
  // Optional: Autoprefixer (may not be installed yet)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  plugins.push(require('autoprefixer'))
} catch (_) {}

module.exports = { plugins }
