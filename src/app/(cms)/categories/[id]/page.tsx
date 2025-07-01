import EditCategory from "@/components/cms/edit-category";

export default function EditCategoryPage({
  params,
}: {
  params: { id: string };
}) {
  return <EditCategory id={params.id} />;
}
