import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Universal-link / App-Link verification files.
      //
      // These MUST be served from the literal paths
      // /.well-known/apple-app-site-association and
      // /.well-known/assetlinks.json — Apple and Google fetch exactly those
      // URLs, over HTTPS, and follow no redirects.
      //
      // The route handlers live in app/well-known/** (no leading dot) on
      // purpose: Next's App Router treats dot-prefixed directories as
      // private and won't create routes for them, so app/.well-known/**
      // would silently produce nothing at all. These rewrites map the real
      // dotted URLs onto the handlers.
      {
        source: "/.well-known/apple-app-site-association",
        destination: "/well-known/apple-app-site-association",
      },
      {
        source: "/.well-known/assetlinks.json",
        destination: "/well-known/assetlinks.json",
      },
    ];
  },
};

export default nextConfig;
