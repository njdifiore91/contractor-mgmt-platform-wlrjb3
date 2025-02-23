declare module 'quasar/wrappers' {
  interface QuasarConfig {
    sass?: {
      variables?: {
        quasar?: string;
      };
    };
    framework?: {
      config?: {
        dark?: 'auto' | boolean;
        notify?: {
          position?: string;
          timeout?: number;
          textColor?: string;
          actions?: Array<{ icon: string; color: string; }>;
        };
        loading?: {
          delay?: number;
          message?: string;
          spinnerSize?: number;
          spinnerColor?: string;
          backgroundColor?: string;
        };
      };
      plugins?: string[];
      iconSet?: string;
      lang?: string;
    };
    animations?: 'all' | string[];
    extras?: string[];
    build?: {
      target?: {
        browser?: string[];
      };
      vueRouterMode?: 'hash' | 'history';
    };
    devServer?: {
      port?: number;
      proxy?: {
        [key: string]: {
          target: string;
          changeOrigin?: boolean;
          secure?: boolean;
        };
      };
    };
    sourceFiles?: {
      rootComponent?: string;
      router?: string;
      store?: string;
    };
    pwa?: {
      workboxMode?: string;
      injectPwaMetaTags?: boolean;
      swFilename?: string;
      manifestFilename?: string;
      useCredentials?: boolean;
    };
    ssr?: {
      pwa?: boolean;
    };
    screen?: {
      breakpoints?: {
        xs?: number;
        sm?: number;
        md?: number;
        lg?: number;
        xl?: number;
      };
    };
  }

  export function configure(callback: () => QuasarConfig): any;
}