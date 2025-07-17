import ProductsCategory from "@/components/cms/entities/category/products";

interface CategoryProductsPageProps {
  params: { id: string };
}

export default function EditCategoryPage({
  params,
}: CategoryProductsPageProps) {
  return <ProductsCategory id={params.id} />;
}
