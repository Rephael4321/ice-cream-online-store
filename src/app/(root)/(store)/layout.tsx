import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";
import Navbar from "@/components/store/navbar";
import SearchBar from "@/components/store/search-products/search-bar";

export default async function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookie = cookies();
  const token = (await cookie).get("token")?.value;
  const isAdmin = !!(token && verifyJWT(token));

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
