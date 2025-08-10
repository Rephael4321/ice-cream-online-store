import type { Metadata } from "next";
import CmsNavbar from "@/components/cms/cms-navbar";
import JwtWrapper from "@/components/auth/jwt-wrapper";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png" }, { url: "/icons/icon-512.png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "המפנק",
  },
};

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <JwtWrapper>
      <CmsNavbar />
      {children}
    </JwtWrapper>
  );
}
