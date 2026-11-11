/** @type {import('next').NextConfig} */

// Parche de seguridad para prevenir ERR_INVALID_URL durante el prerenderizado en Vercel
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = 'https://el-reencuentro-food.vercel.app';
}
if (!process.env.NEXT_PUBLIC_API_URL) {
  process.env.NEXT_PUBLIC_API_URL = '';
}

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
};

module.exports = nextConfig;