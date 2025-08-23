import ProductsCategory from "@/components/cms/entities/category/products";

export default function CategoryProductsPage({
  params,
}: {
  params: { category: string };
}) {
  const name = decodeURIComponent(params.category);
  return <ProductsCategory name={name} />;
}
