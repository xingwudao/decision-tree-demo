/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 确保可以访问public目录下的文件
  assetPrefix: process.env.NODE_ENV === 'production' ? '.' : '',
  basePath: '',
  // 允许在生产环境中导入CSV文件
  webpack: (config) => {
    config.module.rules.push({
      test: /\.csv$/,
      loader: 'file-loader',
      options: {
        name: '[name].[ext]',
        publicPath: '/',
        outputPath: 'public/',
      },
    });
    return config;
  },
  // 添加导出配置
  trailingSlash: true,
  distDir: '.next',
  // 确保正确处理静态资源
  images: {
    unoptimized: true
  },
  // 添加重写规则
  async rewrites() {
    return [
      {
        source: '/data.csv',
        destination: '/public/data.csv',
      },
    ];
  },
}

module.exports = nextConfig 