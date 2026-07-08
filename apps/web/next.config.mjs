/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    domains: ["lh3.googleusercontent.com", "avatars.githubusercontent.com"],
  },
  transpilePackages: ["@onehub/ui", "@onehub/types"],
  webpack: (config, { isServer }) => {
    // Handle CommonJS modules in ES module context
    if (isServer) {
      // Ensure proper module resolution for CommonJS modules
      config.resolve.extensionAlias = {
        ".js": [".js", ".ts", ".tsx"],
      };
    }
    // Exclude codemods scripts from compilation
    config.module.rules.push({
      test: /scripts\/codemods\/.*\.ts$/,
      use: 'ignore-loader'
    });
    return config;
  },
};

export default nextConfig;
