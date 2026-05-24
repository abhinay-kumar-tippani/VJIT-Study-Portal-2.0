const nextConfig = {
  images: {
    domains: [
      'storage.googleapis.com',
      'lh3.googleusercontent.com',
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'googleapis'],
    workerThreads: false,
    cpus: 1,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,   // ← add this too
  },
};

module.exports = nextConfig;