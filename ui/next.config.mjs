/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  outputFileTracingExcludes: {
    '*': ['C:/Users/**', 'C:\\Users\\**'],
  },
};

export default nextConfig;
