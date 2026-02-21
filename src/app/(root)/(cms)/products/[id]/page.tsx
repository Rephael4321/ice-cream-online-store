import EditProduct from "@/components/cms/entities/product/edit";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolved = await params;
  return <EditProduct params={Promise.resolve(resolved)} />;
}
