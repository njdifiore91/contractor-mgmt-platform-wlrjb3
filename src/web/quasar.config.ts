import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import { configure } from 'quasar/wrappers';

// Quasar Framework v2.0.0
// @quasar/vite-plugin v1.4.0

export default configure(() => {
  return {
    // Framework configuration
    framework: {
      // Enable required Quasar plugins
      plugins: [
        'Notify',  // Notification system
        'Dialog',  // Modal dialogs
        'Loading', // Loading indicators
        'Dark'     // Dark mode support
      ],

      // Global configuration
      config: {
        // Enable automatic dark mode detection
        dark: 'auto',

        // Brand colors from variables
        brand: {
          primary: '$primary',
          secondary: '$secondary',
          accent: '$accent',
          dark: '$dark',
          positive: '$positive',
          negative: '$negative',
          info: '$info',
          warning: '$warning'
        },

        // Loading plugin configuration
        loading: {
          delay: 400,
          message: 'Loading...',
          spinnerSize: 140,
          spinnerColor: 'primary',
          backgroundColor: 'rgba(255, 255, 255, 0.9)'
        },

        // Notification configuration
        notify: {
          position: 'top-right',
          timeout: 2500,
          textColor: 'white',
          actions: [{ icon: 'close', color: 'white' }]
        }
      },

      // Icon set configuration
      iconSet: 'material-icons',

      // Language configuration
      lang: 'en-US'
    },

    // Build configuration
    build: {
      // Browser compatibility targets
      target: {
        browser: [
          'chrome 90',
          'firefox 88',
          'safari 14',
          'edge 90'
        ]
      },

      // Vue Router mode
      vueRouterMode: 'history',

      // Vue plugin options
      vitePluginVueOptions: {
        reactivityTransform: true,
        template: {
          transformAssetUrls
        }
      },

      // Environment variables
      env: {
        API_URL: process.env.API_URL
      },

      // SASS variables file
      sassVariables: 'src/assets/styles/quasar.variables.scss',

      // Asset handling
      extendViteConf(viteConf) {
        if (viteConf.build) {
          viteConf.build.chunkSizeWarningLimit = 2000;
        }
      },

      // Vite plugins
      vitePlugins: [
        ['@quasar/vite-plugin', {
          sassVariables: 'src/assets/styles/quasar.variables.scss'
        }]
      ]
    },

    // Development server configuration
    devServer: {
      // Server port
      port: 8080,

      // API proxy configuration
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        }
      },

      // CORS configuration
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    },

    // Responsive breakpoints configuration
    screen: {
      breakpoints: {
        xs: 320,
        sm: 768,
        md: 1024,
        lg: 1440,
        xl: 1920
      }
    },

    // Animation configuration
    animations: 'all',

    // Source map configuration
    sourceMap: true,

    // PWA configuration
    pwa: {
      workboxMode: 'generateSW',
      injectPwaMetaTags: true,
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentials: false
    },

    // SSR configuration
    ssr: {
      pwa: false
    },

    // Quasar App Extension configuration
    extras: [
      'roboto-font',
      'material-icons'
    ],

    // Build optimization
    optimization: {
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 250000
      }
    }
  };
});