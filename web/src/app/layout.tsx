import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SITE_URL } from "@/lib/env";
import { MARCA } from "@/config/marca";
import { CREDITOS } from "@/config/creditos";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display-face", display: "swap" });
const body = Geist({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const code = Geist_Mono({ subsets: ["latin"], variable: "--font-code", display: "swap" });

const TITULO = `Postulaciones · ${MARCA.nombre}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITULO, template: `%s · ${MARCA.nombre}` },
  description: MARCA.descripcion,
  applicationName: MARCA.nombre,
  // Créditos del sistema (LICENSE, cláusula 3): no se quitan
  authors: [{ name: CREDITOS.autor, url: CREDITOS.repositorio }],
  generator: `${CREDITOS.proyecto} · ${CREDITOS.autor}`,
  openGraph: {
    type: "website",
    siteName: MARCA.nombre,
    locale: "es_ES",
    title: TITULO,
    description: MARCA.descripcion,
    images: [MARCA.logo],
  },
  twitter: { card: "summary", title: TITULO, description: MARCA.descripcion },
  robots: { index: true, follow: true },
};

/** Los colores de src/config/marca.ts sustituyen a los de globals.css */
const C = MARCA.colores;
const COLOR_VARS = {
  "--color-acento": C.acento,
  "--color-acento-oscuro": C.acentoOscuro,
  "--color-bedrock": C.fondo,
  "--color-deepslate": C.superficie,
  "--color-slab": C.superficieAlta,
  "--color-seam": C.borde,
  "--color-bone": C.texto,
  "--color-fog": C.textoSuave,
} as React.CSSProperties;

export const viewport: Viewport = { themeColor: MARCA.colores.fondo, colorScheme: "dark" };

// Layout raíz: fuentes, colores de la marca y proveedores.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} ${code.variable}`} style={COLOR_VARS}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
