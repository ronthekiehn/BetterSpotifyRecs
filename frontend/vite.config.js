import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  define: {
    __SERVER_IP__: JSON.stringify(process.env.SERVER_IP),
    __CLIENT_ID__: JSON.stringify(process.env.CLIENT_ID),
    __CLIENT_SECRET__: JSON.stringify(process.env.CLIENT_SECRET)
    __API_URL__ = JSON.stringify(process.env.API_URL);
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        callback: resolve(__dirname, 'callback.html'),
      },
    },
  }
});