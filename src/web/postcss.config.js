// postcss.config.js
// PostCSS configuration for Service Provider Management System frontend
// Handles browser compatibility, optimization and modern CSS features

// autoprefixer@10.4.0 - Add vendor prefixes to CSS rules
const autoprefixer = require('autoprefixer');
// postcss-preset-env@7.0.0 - Convert modern CSS into browser compatible CSS
const postcssPresetEnv = require('postcss-preset-env');
// cssnano@5.0.0 - Optimize and minify CSS for production
const cssnano = require('cssnano');

module.exports = (ctx) => {
  const isProd = ctx.env === 'production';

  // Define responsive breakpoints as custom media queries
  const customMediaQueries = {
    '--xs-viewport': '(max-width: 320px)',
    '--sm-viewport': '(min-width: 321px) and (max-width: 768px)',
    '--md-viewport': '(min-width: 769px) and (max-width: 1024px)',
    '--lg-viewport': '(min-width: 1025px) and (max-width: 1440px)',
    '--xl-viewport': '(min-width: 1441px)'
  };

  // Base configuration with required plugins
  const config = {
    plugins: [
      postcssPresetEnv({
        stage: 3,
        features: {
          'custom-properties': true,
          'nesting-rules': true,
          'custom-media-queries': true,
          'custom-selectors': true,
          'gap-properties': true,
          'media-query-ranges': true
        },
        browsers: [
          'Chrome >= 90',
          'Firefox >= 88',
          'Safari >= 14',
          'Edge >= 90'
        ],
        preserve: false,
        importFrom: [
          {
            customMedia: customMediaQueries
          }
        ]
      }),
      autoprefixer({
        grid: true,
        flexbox: true,
        browsers: [
          'Chrome >= 90',
          'Firefox >= 88',
          'Safari >= 14',
          'Edge >= 90'
        ]
      })
    ]
  };

  // Add optimization plugins for production
  if (isProd) {
    config.plugins.push(
      cssnano({
        preset: [
          'default',
          {
            discardComments: {
              removeAll: true
            },
            normalizeWhitespace: true,
            minifyFontValues: true,
            minifyGradients: true,
            minifySelectors: true,
            reduceIdents: true,
            reduceInitial: true,
            reduceTransforms: true,
            svgo: true,
            zindex: false // Preserve z-index values
          }
        ]
      })
    );
  }

  return config;
};