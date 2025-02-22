import type { Config } from '@jest/types';
import { defaults as tsjPreset } from 'ts-jest/presets';
import { compilerOptions } from './tsconfig.json';

const config: Config.InitialOptions = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Set test environment to jsdom for browser simulation
  testEnvironment: 'jsdom',

  // Module name mapping for aliases and mocks
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.svg$': '<rootDir>/tests/mocks/svgMock.ts',
    '\\.css$': '<rootDir>/tests/mocks/styleMock.ts',
    '^quasar$': '<rootDir>/tests/mocks/quasarMock.ts'
  },

  // Supported file extensions
  moduleFileExtensions: ['js', 'ts', 'json', 'vue'],

  // Transform configuration for TypeScript and Vue files
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.vue$': '@vue/vue3-jest'
  },

  // Test file patterns
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json', 'html'],
  collectCoverageFrom: [
    'src/**/*.{ts,vue}',
    '!src/main.ts',
    '!src/env.d.ts',
    '!src/shims-vue.d.ts',
    '!src/**/*.d.ts',
    '!src/assets/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test setup files
  setupFiles: ['<rootDir>/tests/setup.ts'],

  // Test timeout in milliseconds
  testTimeout: 10000,

  // TypeScript configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      diagnostics: true,
      isolatedModules: true
    }
  },

  // Additional configuration
  verbose: true,
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // Use ts-jest defaults
  ...tsjPreset,

  // Root directory configuration
  rootDir: '.',
  roots: ['<rootDir>/src/', '<rootDir>/tests/'],

  // Cache configuration
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Error handling
  bail: 1,
  errorOnDeprecated: true
};

export default config;