import { createApp } from 'vue'; // ^3.3.0
import { Quasar, Notify, Dialog, Loading } from 'quasar'; // ^2.0.0
import { createPinia } from 'pinia'; // ^2.0.0
import { ApplicationInsights } from '@microsoft/applicationinsights-web'; // ^2.8.0
import { PublicClientApplication } from '@azure/msal-browser'; // ^2.32.0

// Import Quasar styles and icons
import '@quasar/extras/material-icons/material-icons.css'; // ^1.16.0
import 'quasar/dist/quasar.css'; // ^2.0.0

// Import root component and router
import App from './App.vue';
import router from './router';

// Initialize Application Insights
const appInsights = new ApplicationInsights({
  config: {
    connectionString: process.env.VUE_APP_APPINSIGHTS_CONNECTION_STRING,
    enableAutoRouteTracking: true,
    enableCorsCorrelation: true,
    enableRequestHeaderTracking: true,
    enableResponseHeaderTracking: true
  }
});

// Initialize MSAL for Azure AD B2C
const msalConfig = {
  auth: {
    clientId: process.env.VUE_APP_AZURE_CLIENT_ID,
    authority: process.env.VUE_APP_AZURE_AUTHORITY,
    knownAuthorities: [process.env.VUE_APP_AZURE_KNOWN_AUTHORITY],
    redirectUri: window.location.origin
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false
  }
};

const msalInstance = new PublicClientApplication(msalConfig);

// Create Vue application instance
const app = createApp(App);
const pinia = createPinia();

// Configure Quasar framework
function configureQuasar(app: any) {
  app.use(Quasar, {
    plugins: {
      Notify,
      Dialog,
      Loading
    },
    config: {
      brand: {
        primary: '#2196F3',
        secondary: '#607D8B',
        accent: '#FF4081',
        positive: '#4CAF50',
        negative: '#F44336',
        info: '#2196F3',
        warning: '#FF9800'
      },
      notify: {
        position: 'top-right',
        timeout: 5000,
        textColor: 'white'
      },
      loading: {
        spinnerSize: 140,
        spinnerColor: 'primary'
      }
    }
  });
}

// Configure security monitoring
function setupSecurity(app: any) {
  app.config.globalProperties.$security = {
    validateSession: async () => {
      try {
        const account = msalInstance.getAllAccounts()[0];
        if (!account) {
          throw new Error('No active session');
        }
        return true;
      } catch (error) {
        console.error('Session validation failed:', error);
        return false;
      }
    },
    monitorSecurityEvents: () => {
      window.addEventListener('storage', (event) => {
        if (event.key === 'msal.token') {
          app.config.globalProperties.$security.validateSession();
        }
      });
    }
  };
}

// Configure performance monitoring
function setupPerformanceMonitoring(app: any) {
  appInsights.loadAppInsights();
  appInsights.trackPageView();

  app.config.globalProperties.$performance = {
    trackEvent: (name: string, properties?: { [key: string]: any }) => {
      appInsights.trackEvent({ name, properties });
    },
    trackMetric: (name: string, value: number) => {
      appInsights.trackMetric({ name, average: value });
    },
    trackException: (error: Error) => {
      appInsights.trackException({ error });
    }
  };
}

// Error handling
app.config.errorHandler = (err, vm, info) => {
  console.error('Global error:', err);
  appInsights.trackException({ error: err as Error });
};

// Performance marking for initialization
performance.mark('app-init-start');

// Initialize application
async function initializeApp() {
  try {
    // Configure core plugins
    app.use(pinia);
    app.use(router);
    configureQuasar(app);

    // Setup security and monitoring
    setupSecurity(app);
    setupPerformanceMonitoring(app);

    // Mount application
    await router.isReady();
    app.mount('#app');

    // Performance measurement
    performance.mark('app-init-end');
    performance.measure('app-initialization', 'app-init-start', 'app-init-end');

  } catch (error) {
    console.error('Application initialization failed:', error);
    appInsights.trackException({ error: error as Error });
  }
}

// Initialize the application
initializeApp();

// Cleanup handler
window.addEventListener('unload', () => {
  appInsights.flush();
});

export { app, pinia, appInsights, msalInstance };