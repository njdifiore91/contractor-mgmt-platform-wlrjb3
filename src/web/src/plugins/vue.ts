import type { App } from 'vue';
import { createPinia } from 'pinia';
import type { Router } from 'vue-router';
import { createI18n } from 'vue-i18n';

// Import translations
import en from '@/locales/en.json';
import es from '@/locales/es.json';

export function setupVue(app: App, router: Router) {
  // Debug log to check translations
  console.log('Loading translations:', { en, es });

  // Configure i18n
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: {
      en,
      es
    }
  });

  // Install plugins
  app.use(i18n);
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