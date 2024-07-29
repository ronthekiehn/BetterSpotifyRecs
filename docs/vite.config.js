import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    __SERVER_IP__: JSON.stringify(process.env.SERVER_IP)
  }
});