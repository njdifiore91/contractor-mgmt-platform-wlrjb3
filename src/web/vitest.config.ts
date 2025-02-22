import { defineConfig } from 'vitest'; // v0.32.0
import vue from '@vitejs/plugin-vue'; // v4.2.0
import path from 'path'; // v0.12.7
import { resolve } from './vite.config';

export default defineConfig({
  test: {
    // Enable global test utilities and APIs
    globals: true,

    // Use jsdom for DOM emulation in tests
    environment: 'jsdom',

    // Test file patterns
    include: [
      'tests/unit/**/*.spec.ts',
      'tests/components/**/*.spec.ts',
      'tests/integration/**/*.spec.ts',
      'src/**/__tests__/*.spec.ts'
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      'coverage',
      '.quasar',
      'public',
      '**/*.d.ts'
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: [
        'text',
        'json',
        'html',
        'lcov',
        'cobertura'
      ],
      exclude: [
        'src/main.ts',
        'src/env.d.ts',
        'src/shims-vue.d.ts',
        'src/assets/styles/**/*',
        'src/**/*.d.ts',
        'tests/setup/**/*',
        'tests/fixtures/**/*'
      ],
      // Coverage thresholds
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
      // Additional coverage options
      reportOnFailure: true,
      cleanOnRerun: true,
      reportsDirectory: './coverage'
    },

    // Test environment setup files
    setupFiles: [
      'tests/setup/vue.setup.ts',
      'tests/setup/quasar.setup.ts',
      'tests/setup/test-utils.setup.ts'
    ],

    // Global test timeout
    testTimeout: 10000,

    // JSDOM environment options
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        url: 'http://localhost'
      }
    },

    // Snapshot settings
    snapshotFormat: {
      printBasicPrototype: false,
      escapeString: false
    },

    // Pool settings for test isolation
    pool: 'vmThreads',
    poolOptions: {
      vmThreads: {
        useAtomics: true
      }
    },

    // Vue-specific test configuration
    deps: {
      inline: [
        /vue/,
        /quasar/,
        /@vue/,
        /@quasar/
      ]
    },

    // Mock API calls during tests
    mockReset: true
  },

  // Path resolution configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@views': path.resolve(__dirname, './src/views'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@styles': path.resolve(__dirname, './src/assets/styles'),
      '@tests': path.resolve(__dirname, './tests'),
      '@fixtures': path.resolve(__dirname, './tests/fixtures'),
      'vue': 'vue/dist/vue.esm-bundler.js'
    }
  },

  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('q-')
        }
      }
    })
  ]
});