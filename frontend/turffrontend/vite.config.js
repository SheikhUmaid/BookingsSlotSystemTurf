import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    allowedHosts: ['a30b-2409-40f2-4b-1333-594d-9cd3-e649-23af.ngrok-free.app'],
  },
  plugins: [
    tailwindcss(),react()],
})
