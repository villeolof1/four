import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

// Native top-level await is supported in modern browsers, including module
// workers. Avoid vite-plugin-top-level-await: its SWC transform can break
// the production build with "missing field `type`".
export default defineConfig({
  plugins: [wasm()],
  base: './',
  build: { target: 'esnext' },
  worker: { format: 'es', plugins: () => [wasm()] },
});
