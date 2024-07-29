import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  define: {
    __SERVER_IP__: JSON.stringify(process.env.SERVER_IP),
    __CLIENT_ID__: JSON.stringify(process.env.CLIENT_ID),
    __CLIENT_SECRET__: JSON.stringify(process.env.CLIENT_SECRET)
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        nested: resolve(__dirname, 'callback.html'),
      },
    },
  }
});