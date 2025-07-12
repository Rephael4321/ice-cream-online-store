import ProductEdit from "@/components/cms/entities/product/edit";

interface ProductPageProps {
  params: { id: string };
}

export default function ProductPage({ params }: ProductPageProps) {
  return <ProductEdit params={Promise.resolve(params)} />;
}
