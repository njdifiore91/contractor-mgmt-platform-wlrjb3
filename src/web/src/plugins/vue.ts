import type { App } from 'vue';
import { Quasar } from 'quasar';
import type { QuasarPluginOptions } from 'quasar';
import { createPinia } from 'pinia';
import type { Router } from 'vue-router';

// Import Quasar css
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';

export function setupVue(app: App, router: Router) {
  // Configure Quasar
  const quasarOptions: Partial<QuasarPluginOptions> = {
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
      }
    },
    plugins: {}
  };

  // Install plugins
  app.use(Quasar, quasarOptions);
  app.use(createPinia());
  app.use(router);

  // Global error handler
  app.config.errorHandler = (err, vm, info) => {
    console.error('Vue Error:', err);
    console.error('Error Info:', info);
  };

  // Performance monitoring
  if (process.env.NODE_ENV === 'development') {
    app.config.performance = true;
  }

  return app;
} 