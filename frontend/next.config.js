/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['apkaai-assets.s3.ap-south-1.amazonaws.com', 'cdn.apkaai.com'],
    // PNG from public folder works without dangerouslyAllowSVG
    unoptimized: false,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },
  // ── Proxy /api/* → backend (port 4000) in local development ─────────────
  // In production, Nginx handles this rewrite instead.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
