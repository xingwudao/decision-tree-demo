/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // 确保可以访问public目录下的文件
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : undefined,
  // 允许在生产环境中导入CSV文件
  webpack: (config) => {
    config.module.rules.push({
      test: /\.csv$/,
      loader: 'file-loader',
      options: {
        name: '[name].[ext]',
      },
    });
    return config;
  },
}

module.exports = nextConfig 