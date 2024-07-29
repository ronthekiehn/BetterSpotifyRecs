import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    __SERVER_IP__: JSON.stringify(process.env.SERVER_IP),
    __CLIENT_ID__: JSON.stringify(process.env.CLIENT_ID),
    __CLIENT_SECRET__: JSON.stringify(process.env.CLIENT_SECRET)
  }
});