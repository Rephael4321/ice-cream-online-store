import CategoryProducts from "@/components/cms/category-products";

interface CategoryProductsPageProps {
  params: { id: string };
}

export default function EditCategoryPage({ params }: CategoryProductsPageProps) {
  return <CategoryProducts id={params.id} />;
}
