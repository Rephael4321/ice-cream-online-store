import ProductsByCategory from "@/components/store/products-by-category";

interface CategoryPageProps {
  params: { category: string };
}

export default function ProductsByCategoryPage({ params }: CategoryPageProps) {
  return <ProductsByCategory params={Promise.resolve(params)} />;
}
