import type { NextConfig } from "next";

// Short links for the social bios. In-app browsers (TikTok, Instagram) often
// send no referrer, so without these a bio click shows up as "Direct". The
// utm_source survives the redirect and /admin breaks visits and signups down
// by it. Temporary (307) so a link can be repointed later.
const BIO_LINKS = { tt: "tiktok", ig: "instagram", yt: "youtube" };

const nextConfig: NextConfig = {
  async redirects() {
    return Object.entries(BIO_LINKS).map(([path, platform]) => ({
      source: `/${path}`,
      destination: `/?utm_source=${platform}&utm_medium=bio`,
      permanent: false,
    }));
  },
};

export default nextConfig;
