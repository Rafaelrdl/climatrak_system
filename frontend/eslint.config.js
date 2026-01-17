import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { 
    ignores: [
      'dist', 
      'coverage/**',
      'packages/**', 
      'node_modules/**',
      '**/*.config.js',
      '**/*.config.ts'
    ] 
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Disable algumas regras que podem ser muito restritivas durante o desenvolvimento
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use appStorage wrapper in src/lib/storage.ts' },
        { name: 'sessionStorage', message: 'Use appStorage wrapper in src/lib/storage.ts' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: 'Use appStorage wrapper in src/lib/storage.ts' },
        { object: 'window', property: 'sessionStorage', message: 'Use appStorage wrapper in src/lib/storage.ts' },
        { object: 'globalThis', property: 'localStorage', message: 'Use appStorage wrapper in src/lib/storage.ts' },
        { object: 'globalThis', property: 'sessionStorage', message: 'Use appStorage wrapper in src/lib/storage.ts' },
      ],
      // Permitir exports de constantes em componentes UI
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['src/lib/storage.ts', 'src/**/__tests__/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },
  // Cypress E2E tests config
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['cypress/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        cy: 'readonly',
        Cypress: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        before: 'readonly',
        after: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      // Chai assertions use expressions like expect().to.exist
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
)
