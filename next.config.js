/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow server-side Node.js modules (fs, path) in API routes
  experimental: {
    serverComponentsExternalPackages: ['xlsx'],
  },
  // Ensure xlsx can read/write files
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only modules on client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
