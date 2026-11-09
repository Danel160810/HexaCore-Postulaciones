import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // El alias "@/..." → "src/..." también se define aquí, por si tsconfig.json no llega al repositorio
  webpack(config) {
    config.resolve.alias["@"] = path.join(root, "src");
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Creado-Por", value: "HexaCore Postulaciones - HexaCore ft. Danel" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Solo HTTPS durante un año (también subdominios)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // CSP mínima que no rompe los scripts de Next: nadie puede meter la web en un iframe,
          // cambiar la base de los enlaces, cargar plugins ni enviar formularios a otro sitio
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self' https://discord.com; upgrade-insecure-requests",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
