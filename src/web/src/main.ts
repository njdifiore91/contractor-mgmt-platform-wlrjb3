import { createApp } from 'vue'; // ^3.3.0
import { Quasar, Notify, Dialog, Loading } from 'quasar'; // ^2.0.0
import { createPinia } from 'pinia'; // ^2.0.0
import { ApplicationInsights } from '@microsoft/applicationinsights-web'; // ^2.8.0
import { PublicClientApplication } from '@azure/msal-browser'; // ^2.32.0

// Import Quasar css
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/dist/quasar.css';

// Import TailwindCSS styles
import '@/assets/styles/tailwind.css';

// Import root component and router
import App from './App.vue';
import router from './router';
import { setupVue } from './plugins/vue';

// Initialize Application Insights if connection string is available
const appInsightsConnectionString = import.meta.env.VITE_APP_APPINSIGHTS_CONNECTION_STRING;

let appInsights: ApplicationInsights | null = null;
if (appInsightsConnectionString) {
    appInsights = new ApplicationInsights({
        config: {
            connectionString: appInsightsConnectionString,
            enableAutoRouteTracking: true,
            enableCorsCorrelation: true,
            enableRequestHeaderTracking: true,
            enableResponseHeaderTracking: true
        }
    });
    appInsights.loadAppInsights();
    appInsights.trackPageView();
} else if (import.meta.env.DEV) {
    console.info('Application Insights connection string not provided in development mode. Telemetry disabled.');
}

// Initialize MSAL for Azure AD B2C
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_APP_AZURE_CLIENT_ID || '',
    authority: import.meta.env.VITE_APP_AZURE_AUTHORITY || '',
    knownAuthorities: [import.meta.env.VITE_APP_AZURE_KNOWN_AUTHORITY || ''],
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

// Make app instance available globally
(window as any).vueApp = app;

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
        primary: '#1976D2',
        secondary: '#26A69A',
        accent: '#9C27B0',
        dark: '#1D1D1D',
        positive: '#21BA45',
        negative: '#C10015',
        info: '#31CCEC',
        warning: '#F2C037'
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
        // Don't throw error, just return false if no session
        return !!account;
      } catch (error) {
        console.warn('Session validation check:', error);
        return false;
      }
    },
    monitorSecurityEvents: () => {
      window.addEventListener('storage', (event) => {
        if (event.key === 'msal.token') {
          app.config.globalProperties.$security.validateSession();
        }
      });
    },
    initializeAuth: async () => {
      try {
        // Try to initialize MSAL silently
        const silentRequest = {
          scopes: ['openid', 'profile', 'email'],
          account: msalInstance.getAllAccounts()[0],
          forceRefresh: false
        };
        
        if (silentRequest.account) {
          await msalInstance.acquireTokenSilent(silentRequest);
          return true;
        }
        return false;
      } catch (error) {
        console.warn('Auth initialization failed:', error);
        return false;
      }
    }
  };
}

// Configure performance monitoring
function setupPerformanceMonitoring(app: any) {
    if (appInsights) {
        app.config.globalProperties.$performance = {
            trackEvent: (name: string, properties?: { [key: string]: any }) => {
                appInsights?.trackEvent({ name, properties });
            },
            trackMetric: (name: string, value: number) => {
                appInsights?.trackMetric({ name, average: value });
            },
            trackException: (error: Error) => {
                appInsights?.trackException({ error });
            }
        };
    } else {
        app.config.globalProperties.$performance = {
            trackEvent: () => {},
            trackMetric: () => {},
            trackException: (error: Error) => {
                console.error('Error tracked:', error);
            }
        };
    }
}

// Error handling
app.config.errorHandler = (err, vm, info) => {
    console.error('Global error:', err);
    if (appInsights) {
        appInsights.trackException({ error: err as Error });
    }
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
    if (appInsights) {
      appInsights.trackException({ error: error as Error });
    }
  }
}

// Initialize the application
initializeApp();

// Cleanup handler
window.addEventListener('unload', () => {
    appInsights?.flush();
});

export { app, pinia, appInsights, msalInstance };