import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc' /* ini dirubah */
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    legacy({
      targets: ['defaults', 'not IE 11'], 
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // --- TAMBAHKAN BAGIAN INI ---
    target: 'es2015', // Targetkan sintaks JavaScript yang lebih tua (ES2015/ES6)
    cssTarget: 'chrome61', // Targetkan browser yang lebih tua untuk prefixing CSS
  },
})
