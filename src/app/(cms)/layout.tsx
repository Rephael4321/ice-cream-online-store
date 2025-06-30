import CmsNavbar from "@/components/cms/cms-navbar";

export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <CmsNavbar />
      {children}
    </>
  );
}
