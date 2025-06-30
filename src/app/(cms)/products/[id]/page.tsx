import Product from "@/components/cms/product";

interface ProductPageProps {
  params: { id: string };
}

export default function ProductPage({ params }: ProductPageProps) {
  return <Product params={Promise.resolve(params)} />;
}
