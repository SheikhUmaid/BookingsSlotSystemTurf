import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  server: {
    allowedHosts: ['a30b-2409-40f2-4b-1333-594d-9cd3-e649-23af.ngrok-free.app'],
  },
  plugins: [
    tailwindcss(), react(), VitePWA({
      registerType: "autoUpdate",

      devOptions: {
        enabled: true,
        // type: "module",
      },


      manifest: {
        id: "/",
        name: "Turf Booking",
        short_name: "TurfBook",
        description: "Book sports turf time slots easily.",
        theme_color: "#101715",
        background_color: "#101715",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "portrait",

        icons: [
          {
            src: "/pwa-icon.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/pwa-icon.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })],
})
