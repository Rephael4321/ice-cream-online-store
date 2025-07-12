import EditProduct from "@/components/cms/entities/product/edit";

interface ProductPageProps {
  params: { id: string };
}

export default function ProductPage({ params }: ProductPageProps) {
  return <EditProduct params={Promise.resolve(params)} />;
}
