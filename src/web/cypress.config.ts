import { defineConfig } from 'cypress';

// Environment variables with defaults
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:5000/auth';
const TEST_TIMEOUT = Number(import.meta.env.TEST_TIMEOUT || 10000);
const RETRY_COUNT = Number(import.meta.env.RETRY_COUNT || 2);

export default defineConfig({
  // E2E Testing Configuration
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'tests/e2e/**/*.cy.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    videoCompression: 32,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: TEST_TIMEOUT,
    pageLoadTimeout: 30000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    env: {
      apiUrl: API_URL,
      authUrl: AUTH_URL,
      coverage: true,
      codeCoverage: {
        url: '/api/__coverage__'
      }
    },
    setupNodeEvents(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
      // Register test failure handlers
      on('test:after:run', (test, runnable) => {
        if (test.state === 'failed') {
          console.log('Test failed:', test.title);
          console.log('Error:', test.err?.message);
          console.log('Stack:', test.err?.stack);
        }
      });

      // Configure browser launch options
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome' && browser.isHeadless) {
          launchOptions.args.push('--disable-gpu');
          launchOptions.args.push('--no-sandbox');
          launchOptions.args.push('--disable-dev-shm-usage');
        }
        return launchOptions;
      });

      // Initialize test result reporting
      require('cypress-mochawesome-reporter/plugin')(on);

      // Return updated config
      return config;
    }
  },

  // Component Testing Configuration
  component: {
    devServer: {
      framework: 'vue',
      bundler: 'vite',
      viteConfig: {
        optimizeDeps: {
          include: ['vue', 'quasar']
        }
      }
    },
    specPattern: 'tests/components/**/*.spec.ts',
    supportFile: 'cypress/support/component.ts',
    indexHtmlFile: 'cypress/support/component-index.html'
  },

  // Retry Configuration
  retries: {
    runMode: RETRY_COUNT,
    openMode: 0
  },

  // Global Configuration
  watchForFileChanges: true,
  chromeWebSecurity: false,
  viewportWidth: 1280,
  viewportHeight: 720,

  // Reporter Configuration
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'spec, mocha-junit-reporter',
    mochaJunitReporterReporterOptions: {
      mochaFile: 'cypress/results/junit/results-[hash].xml'
    }
  },

  // Screenshot Configuration
  screenshotsFolder: 'cypress/screenshots',
  trashAssetsBeforeRuns: true,

  // Video Configuration
  videosFolder: 'cypress/videos',
  videoUploadOnPasses: false,

  // Experimental Features
  experimentalMemoryManagement: true,
  experimentalModifyObstructiveThirdPartyCode: true,

  // Performance Configuration
  numTestsKeptInMemory: 50,
  experimentalSourceRewriting: true,
  blockHosts: ['*google-analytics.com', '*hotjar.com']
});