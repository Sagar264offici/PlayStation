import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'public', 'node_modules', 'scripts'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // The scroll system deliberately mutates a module-level `stage` object
      // every frame and reads it from `useFrame` callbacks. It is the point of
      // the architecture, not an accident.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Unused args are allowed when prefixed with `_`, which keeps the GSAP
      // callback signatures readable.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    /*
     * React Three Fiber is an imperative rendering loop, and the compiler-aware
     * react-hooks rules do not model it.
     *
     * `useFrame` callbacks run once per animation frame, long after render, and
     * their entire contract is to mutate three.js objects in place: camera
     * transforms, scene fog, group rotations, material emissive intensity.
     * Reading those through `useThree()` and writing to them is correct R3F, and
     * the `immutability` rule reports every one of those writes as an error.
     *
     * These are disabled for the scene layer only. They stay on for the DOM,
     * where the same rules catch real bugs — the `useSyncExternalStore` fix in
     * `hooks/useMediaQuery` came out of exactly this.
     */
    files: ['src/three/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
    },
  },
);
