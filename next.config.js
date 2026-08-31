/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'akamai.sscdn.co',
        pathname: '/letras/**',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/favicon.ico',
      },
    ],
  },
};

module.exports = nextConfig;
