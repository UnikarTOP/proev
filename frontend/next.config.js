/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Served-By', value: 'proev.ru' },
          // Запрещаем браузеру переиспользовать HTTP/2 соединение для api.proev.ru
          { key: 'Vary', value: 'Host' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
