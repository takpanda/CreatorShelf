/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    const internalUrl = process.env.API_INTERNAL_URL || "http://localhost:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${internalUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
