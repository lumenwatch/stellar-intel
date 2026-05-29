import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import tseslint from '@typescript-eslint/eslint-plugin';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  {
    // The @typescript-eslint plugin and parser are already registered by
    // eslint-config-next/typescript (...nextTs). Re-declaring them here throws
    // "Cannot redefine plugin", so we only layer rules on top.
    rules: {
      ...tseslint.configs.recommended.rules,
      // Rely solely on @typescript-eslint/no-unused-vars (from recommended).
      // The base no-unused-vars false-positives on type-annotation parameter
      // names (e.g. `onChange: (value: string) => void`).
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Maintenance / build scripts legitimately log to stdout.
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
