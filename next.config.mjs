/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Turbopack is fine in dev, but don’t force anything else for now
    turbo: true,
    // Keep React Compiler OFF until you're stable
    reactCompiler: false,
  },
};
export default nextConfig;
