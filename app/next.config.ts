import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the dev-mode "N" indicator badge during local `npm run dev`
  // preview. Irrelevant to production either way -- Next.js never renders
  // it in a real `next build`/deployed app, this is purely a local-preview
  // annoyance fix.
  devIndicators: false,
};

export default nextConfig;
