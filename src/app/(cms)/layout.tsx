// app/(cms)/layout.tsx
import CmsNavbar from "@/components/cms/cms-navbar";
import JwtWrapper from "@/components/auth/jwt-wrapper";

export default function CmsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <JwtWrapper>
      <CmsNavbar />
      {children}
    </JwtWrapper>
  );
}
