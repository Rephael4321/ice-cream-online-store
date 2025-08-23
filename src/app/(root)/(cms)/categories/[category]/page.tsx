import EditCategory from "@/components/cms/entities/category/edit";

export default function EditCategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const name = decodeURIComponent(params.category);
  return <EditCategory name={name} />;
}
