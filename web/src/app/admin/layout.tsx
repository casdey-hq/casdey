import type { Metadata } from "next";

// Saved to an iPhone home screen, /admin opens as its own app: named "Casdey
// Admin", starting on /admin, on a white launch screen instead of black.
export const metadata: Metadata = {
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "Casdey Admin", statusBarStyle: "default" },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
