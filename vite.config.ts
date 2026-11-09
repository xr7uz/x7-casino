import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" damit die App in der iOS-WebView von Capacitor aus dem lokalen Ordner lädt
export default defineConfig({
  base: "./",
  plugins: [react()],
});
