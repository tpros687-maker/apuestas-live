import type { MetadataRoute } from "next";

// Permite "Agregar a pantalla de inicio" (necesario para las notificaciones en iPhone).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TIMBA",
    short_name: "TIMBA",
    description: "Tus apuestas en vivo: resultados, goleadores y avisos.",
    start_url: "/",
    display: "standalone",
    background_color: "#060607",
    theme_color: "#060607",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
