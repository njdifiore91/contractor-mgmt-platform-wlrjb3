// postcss.config.js
// PostCSS configuration for Service Provider Management System frontend
// Handles browser compatibility, optimization and modern CSS features

module.exports = {
  plugins: {
    'postcss-import': {},
    'tailwindcss/nesting': 'postcss-nesting',
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? {
      cssnano: {
        preset: 'default'
      }
    } : {})
  }
}