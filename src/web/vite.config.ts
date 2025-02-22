import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar } from '@quasar/vite-plugin';
import path from 'path';
import { framework, build as quasarBuild } from './quasar.config';

// Vite v4.3.0
// @vitejs/plugin-vue v4.2.0
// @quasar/vite-plugin v1.4.0
// path v0.12.7

export default defineConfig({
  plugins: [
    vue({
      reactivityTransform: true,
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('q-')
        }
      }
    }),
    quasar({
      sassVariables: 'src/assets/styles/quasar.variables.scss',
      framework: framework,
      autoImportComponentCase: 'pascal'
    })
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@views': path.resolve(__dirname, './src/views'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@styles': path.resolve(__dirname, './src/assets/styles')
    }
  },

  server: {
    port: 8080,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        proxyTimeout: 30000,
        headers: {
          'Connection': 'keep-alive'
        },
        onError: (err) => {
          console.error('Proxy error:', err);
        }
      }
    },
    hmr: {
      overlay: true
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  },

  build: {
    target: ['chrome90', 'firefox88', 'safari14', 'edge90'],
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia', 'quasar'],
          'components': ['./src/components/**/*.vue'],
          'views': ['./src/views/**/*.vue']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    reportCompressedSize: true
  },

  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'quasar',
      '@vueuse/core'
    ],
    exclude: ['@quasar/extras']
  },

  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @import "@/assets/styles/quasar.variables.scss";
          @import "@/assets/styles/variables.scss";
        `
      }
    },
    devSourcemap: true
  },

  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  },

  preview: {
    port: 8080,
    strictPort: true
  }
});