import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.spoonacular.com",
        pathname: "/**",
      },
    ],
    localPatterns: [
      {
        pathname: "/api/image-proxy",
      },
    ],
    qualities: [75, 85, 92],
  },
};

export default nextConfig;
