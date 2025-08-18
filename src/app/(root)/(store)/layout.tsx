import type { Metadata } from "next";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";
import Navbar from "@/components/store/navbar";
import SearchBar from "@/components/store/search-products/search-bar";

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

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookie = cookies();
  const token = (await cookie).get("token")?.value;
  const payload = token ? await verifyJWT(token) : null;
  const isAdmin = Boolean(
    payload && (payload.role === "admin" || payload.id === "admin")
  );

  return (
    <>
      <Navbar isAdmin={isAdmin} />
      <div className="px-4 pt-2 sm:px-6 md:px-8">
        <SearchBar />
      </div>
      {children}
    </>
  );
}
