import ProductsCategory from "@/components/cms/entities/category/products";

export default async function CategoryProductsPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const name = decodeURIComponent(category);
  return <ProductsCategory name={name} />;
}
