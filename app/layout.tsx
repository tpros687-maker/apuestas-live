import type { Metadata, Viewport } from "next";
import Rail from "@/components/Rail";
import "./globals.css";

export const metadata: Metadata = {
  title: "TIMBA",
  description: "Seguí tus apuestas en vivo: resultados, goleadores y avisos.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#060607", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700&display=swap"
        />
      </head>
      <body>
        <div className="shell">
          <Rail />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
