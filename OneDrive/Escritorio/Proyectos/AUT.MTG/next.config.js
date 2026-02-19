/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Cloudflare Pages specific config
  trailingSlash: true,
}

module.exports = nextConfig
