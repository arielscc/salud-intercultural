import { withPayload } from "@payloadcms/next/withPayload";

const privateRouteHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-store, max-age=0, must-revalidate"
  },
  {
    key: "Pragma",
    value: "no-cache"
  },
  {
    key: "Referrer-Policy",
    value: "no-referrer"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  },
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive, nosnippet"
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb"
    }
  },
  async headers() {
    return [
      {
        source: "/sigeco/:path*",
        headers: privateRouteHeaders
      },
      {
        source: "/admin/:path*",
        headers: privateRouteHeaders
      },
      {
        source: "/api/:path*",
        headers: privateRouteHeaders
      }
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536],
    imageSizes: [96, 160, 220, 320, 480, 720, 900],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com"
      }
    ]
  }
};

export default withPayload(nextConfig);
