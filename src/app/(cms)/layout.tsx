import JwtGatekeeper from "@/components/auth/jwt-gatekeeper";
import CmsNavbar from "@/components/cms/cms-navbar";

export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <JwtGatekeeper>
        <CmsNavbar />
        {children}
      </JwtGatekeeper>
    </>
  );
}
