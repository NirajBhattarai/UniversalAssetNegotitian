import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@hashgraph/sdk',
      'hedera-agent-kit',
      'langchain',
      '@langchain/core',
      '@langchain/groq',
      'pino',
      'pino-pretty',
      'sonic-boom',
      'pino-abstract-transport',
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        worker_threads: false,
      };
    }
    return config;
  },
};

export default nextConfig;
