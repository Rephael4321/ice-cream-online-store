import EditCategory from "@/components/cms/entities/category/edit";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const name = decodeURIComponent(category);
  return <EditCategory name={name} />;
}
