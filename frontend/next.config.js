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
}

module.exports = nextConfig
