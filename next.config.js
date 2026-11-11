/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  // Desactivamos la generación estática automática conflictiva
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;