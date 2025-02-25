import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar } from '@quasar/vite-plugin';
import path from 'path';
import { fileURLToPath, URL } from 'url';

// Vite v4.3.0
// @vitejs/plugin-vue v4.2.0
// @quasar/vite-plugin v1.4.0
// path v0.12.7

export default defineConfig({
  plugins: [
    vue({
      script: {
        defineModel: true,
        propsDestructure: true,
        // Enable TypeScript features
        refSugar: true,
        reactivityTransform: true,
      },
    }),
    quasar(),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@dummy-backend': fileURLToPath(new URL('./dummy-backend/src', import.meta.url)),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    preserveSymlinks: true,
  },

  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@use "sass:math"; @use "sass:map";',
      },
    },
    devSourcemap: true,
  },

  server: {
    port: 8080,
    host: true,
    fs: {
      strict: false,
      allow: ['..'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('pinia') || id.includes('quasar')) {
              return 'vendor';
            }
          }
          if (id.includes('/src/components/')) {
            return 'components';
          }
          if (id.includes('/src/views/')) {
            return 'views';
          }
          return null;
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    reportCompressedSize: true,
  },

  optimizeDeps: {
    include: ['vue', 'pinia', 'quasar', '@vueuse/core'],
    exclude: [],
    esbuildOptions: {
      target: 'esnext',
    },
  },

  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    target: 'es2020',
  },

  preview: {
    port: 8080,
    strictPort: true,
  },
});
