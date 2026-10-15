import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      'coverage',
      'node_modules',
      // Prototipos de diseño: referencia, no código del proyecto.
      'design_handoff_palacio_corporal',
    ],
  },
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat['recommended-latest'],
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Regla 7: sin `any` salvo en adaptadores de importación, y documentado.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    // Regla 3: el motor de repaso es puro (sin I/O ni persistencia).
    files: ['src/srs/**/*.ts', 'src/domain/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/srs y src/domain deben ser puros (sin I/O).' },
        { name: 'document', message: 'src/srs y src/domain deben ser puros (sin I/O).' },
        { name: 'localStorage', message: 'src/srs y src/domain deben ser puros (sin I/O).' },
        { name: 'fetch', message: 'src/srs y src/domain deben ser puros (sin I/O).' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/db/*', '@/io/*', '@/state/*', 'dexie', 'react', 'zustand'],
              message: 'src/srs y src/domain no pueden depender de persistencia ni de la UI.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    files: ['vite.config.ts', 'scripts/**/*.{ts,js}'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
