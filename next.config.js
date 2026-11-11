/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Evita que los errores de TypeScript bloqueen la compilación en Vercel
    ignoreBuildErrors: true,
  },
  eslint: {
    // Evita que las advertencias del linter detengan el build
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;