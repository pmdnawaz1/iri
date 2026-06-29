import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      'node_modules/**',
      '.claude/**',
      'inspirations/**',
      'eos/state/**',
      'eos/tspecs/**',
      'tools/steal/**'
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-namespace': 'warn',
      '@typescript-eslint/no-var-requires': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
      'no-undef': 'off', // handled by TS
      'no-constant-condition': 'warn'
    },
  }
);
