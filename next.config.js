/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'storage.googleapis.com',
      'lh3.googleusercontent.com', // Google profile pictures
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'googleapis'],
  },
  eslint: {
  ignoreDuringBuilds: true,
},
};

module.exports = nextConfig;
