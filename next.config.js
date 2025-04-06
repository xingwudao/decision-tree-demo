/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 移除 standalone 输出，因为它可能导致部署问题
  // output: 'standalone',
  // 确保可以访问public目录下的文件
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : undefined,
  // 允许在生产环境中导入CSV文件
  webpack: (config) => {
    config.module.rules.push({
      test: /\.csv$/,
      loader: 'file-loader',
      options: {
        name: '[name].[ext]',
        publicPath: '/_next/static/files/',
        outputPath: 'static/files/',
      },
    });
    return config;
  },
  // 添加导出配置
  trailingSlash: false,
  distDir: '.next',
}

module.exports = nextConfig 