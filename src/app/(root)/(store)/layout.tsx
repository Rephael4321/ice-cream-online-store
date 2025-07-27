import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";
import Navbar from "@/components/store/navbar";

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
      {children}
    </>
  );
}
