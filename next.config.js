/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Required so Next.js doesn't try to handle /api/socketio
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
