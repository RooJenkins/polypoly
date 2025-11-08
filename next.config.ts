import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        pathname: '/npm/@lobehub/icons-static-png@latest/**',
      },
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude non-JS files from libsql packages
    config.module.rules.push({
      test: /\.(md|LICENSE)$/,
      type: 'asset/source',
    });

    // Externalize libsql native modules for server-side
    if (isServer) {
      config.externals.push({
        '@libsql/client': '@libsql/client',
        '@prisma/adapter-libsql': '@prisma/adapter-libsql',
      });
    }

    return config;
  },
};

export default nextConfig;
