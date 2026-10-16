import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'LiveTry',
      fileName: (format) => `livetry.${format === 'es' ? 'js' : `${format}.js`}`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      output: {
        globals: {
          // No external globals required for self-contained bundle
        }
      }
    }
  }
});
