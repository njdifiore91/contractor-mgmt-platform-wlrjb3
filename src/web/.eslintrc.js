module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
  },
  extends: [
    'plugin:vue/vue3-recommended',
    '@vue/typescript/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 2022,
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
    project: './tsconfig.json',
    extraFileExtensions: ['.vue'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'vue'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/restrict-template-expressions': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',

    // Vue specific rules
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    'vue/component-definition-name-casing': ['error', 'PascalCase'],
    'vue/require-default-prop': 'error',
    'vue/require-prop-types': 'error',
    'vue/order-in-components': 'error',
    'vue/attributes-order': 'error',
    'vue/this-in-template': ['error', 'never'],
    'vue/html-self-closing': ['error', {
      html: {
        void: 'always',
        normal: 'always',
        component: 'always'
      }
    }],
    'vue/max-attributes-per-line': ['error', {
      singleline: 3,
      multiline: 1
    }],
    'vue/multi-word-component-names': 'error',
    'vue/no-v-html': 'error',
    'vue/require-explicit-emits': 'error',
    'vue/v-on-event-hyphenation': ['error', 'always'],

    // General ESLint rules
    'no-console': import.meta.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': import.meta.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-expressions': 'error',
    'no-unused-labels': 'error',
    'no-unused-private-class-members': 'error',
    'prefer-const': 'error',
    'prefer-template': 'error',
    'require-await': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'brace-style': ['error', '1tbs'],

    // Import rules
    'import/no-unresolved': 'off', // TypeScript handles this
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: [
        'tests/**/*',
        'vite.config.ts',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    }],

    // Quasar specific rules
    'vue/valid-v-bind-sync': 'off', // Quasar uses v-model instead
  },
  settings: {
    'vue/compiler-macros': {
      defineProps: true,
      defineEmits: true,
      defineExpose: true,
      withDefaults: true,
    },
  },
  overrides: [
    {
      files: ['*.vue'],
      rules: {
        'no-undef': 'off', // TypeScript handles this for Vue files
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': ['error', {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        }],
      },
    },
    {
      files: ['*.test.ts', '*.spec.ts'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
  ],
};