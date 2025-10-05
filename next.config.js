/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // External packages for server components
  serverExternalPackages: ['leaflet', 'react-leaflet']
}

module.exports = nextConfig
