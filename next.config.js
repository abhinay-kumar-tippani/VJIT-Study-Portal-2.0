const nextConfig = {
  images: {
    domains: [
      'storage.googleapis.com',
      'lh3.googleusercontent.com',
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'googleapis'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,   // ← add this too
  },
};

module.exports = nextConfig;