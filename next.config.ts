import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.talabat.com' },
      { protocol: 'https', hostname: '*.deliveroo.com' },
      { protocol: 'https', hostname: '*.careem.com' },
      { protocol: 'https', hostname: '*.keeta.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'images.ctfassets.net' },
    ],
  },
  serverExternalPackages: ['playwright', '@prisma/client'],
}

export default nextConfig
