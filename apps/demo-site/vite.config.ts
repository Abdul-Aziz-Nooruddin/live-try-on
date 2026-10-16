import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pdp: resolve(__dirname, 'pdp/index.html'),
        collection: resolve(__dirname, 'collection/index.html'),
        styleguide: resolve(__dirname, 'styleguide/index.html')
      }
    }
  }
});
