import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(root, 'src'),
      '@/components': resolve(root, 'src/components'),
      '@/three': resolve(root, 'src/three'),
      '@/assets': resolve(root, 'public/assets'),
      '@/animations': resolve(root, 'src/animations'),
      '@/hooks': resolve(root, 'src/hooks'),
      '@/data': resolve(root, 'src/data'),
      '@/utils': resolve(root, 'src/utils'),
    },
  },

  server: {
    port: 3000,
  },

  build: {
    target: 'es2022',

    // Vite's default bundle directory is `assets/`, which is also where the
    // runtime assets live (`public/assets/` is copied verbatim into `dist/`).
    // The two then share a prefix: content-hashed bundles sit next to
    // fixed-URL files like the 6MB controller FBX. That makes it impossible to
    // cache the bundles immutably without also pinning the meshes forever.
    //
    // Sending bundles to `build/` keeps the two address spaces separate, so
    // `/build/*` is safe to cache forever and `/assets/*` can revalidate.
    assetsDir: 'build',

    // Three.js is ~1MB raw / ~280KB gzipped and is unavoidable for a WebGL
    // experience of this kind. The default 500kB warning would fire on a
    // payload that cannot realistically be shrunk further, so the limit is
    // raised rather than left to warn on every build.
    chunkSizeWarningLimit: 1200,

    // The WebGL payload is by far the largest dependency. Splitting it into its
    // own long-cached chunk means a copy tweak does not invalidate 700KB of
    // Three.js for returning visitors.
    rollupOptions: {
      output: {
        // Rolldown requires the function form. Chunking is driven by module id
        // rather than an entry list so that anything a dependency pulls in
        // transitively (three-stdlib, maath, suspend-react) is captured too —
        // an explicit entry list would strand those in the app chunk and split
        // the Three.js singletons across two files.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (/[\\/]node_modules[\\/](three|three-stdlib|maath|@react-three[\\/])/.test(id)) {
            return 'three';
          }

          if (/[\\/]node_modules[\\/]gsap[\\/]/.test(id)) {
            return 'gsap';
          }

          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return 'react';
          }

          return undefined;
        },
      },
    },
  },
});
