/* eslint-disable @typescript-eslint/no-explicit-any */
import { configure } from 'quasar/wrappers';

// https://quasar.dev/quasar-cli-vite/quasar-config-js
export default configure(() => ({
  sass: {
    variables: {
      quasar: 'src/assets/styles/quasar.variables.scss'
    }
  },

  framework: {
    config: {
      dark: 'auto',
      notify: {
        position: 'top-right',
        timeout: 2500,
        textColor: 'white',
        actions: [{ icon: 'close', color: 'white' }]
      },
      loading: {
        delay: 400,
        message: 'Loading...',
        spinnerSize: 140,
        spinnerColor: 'primary',
        backgroundColor: 'rgba(255, 255, 255, 0.9)'
      }
    },
    plugins: [
      'Notify',
      'Dialog',
      'Loading',
      'Dark'
    ],
    components: [
      'QLayout',
      'QHeader',
      'QDrawer',
      'QPageContainer',
      'QPage',
      'QToolbar',
      'QToolbarTitle',
      'QBtn',
      'QIcon',
      'QList',
      'QItem',
      'QItemSection',
      'QItemLabel',
      'QCard',
      'QCardSection',
      'QCardActions',
      'QForm',
      'QInput',
      'QSelect',
      'QSpinner',
      'QTable',
      'QTh',
      'QTr',
      'QTd',
      'QSpace',
      'QSeparator',
      'QChip',
      'QBadge',
      'QDialog',
      'QBtnGroup'
    ],
    iconSet: 'material-icons',
    lang: 'en-US'
  },

  animations: 'all',

  extras: [
    'roboto-font',
    'material-icons'
  ],

  build: {
    target: {
      browser: [
        'chrome 90',
        'firefox 88',
        'safari 14',
        'edge 90'
      ]
    },
    vueRouterMode: 'history'
  },

  devServer: {
    server: {
      type: 'http',
      port: 8080
    }
  },

  sourceFiles: {
    rootComponent: 'src/App.vue',
    router: 'src/router',
    store: 'src/stores'
  },

  pwa: {
    workboxMode: 'GenerateSW',
    injectPwaMetaTags: true,
    swFilename: 'sw.js',
    manifestFilename: 'manifest.json',
    useCredentials: false
  },

  ssr: {
    pwa: false
  },

  screen: {
    breakpoints: {
      xs: 320,
      sm: 768,
      md: 1024,
      lg: 1440,
      xl: 1920
    }
  }
}));