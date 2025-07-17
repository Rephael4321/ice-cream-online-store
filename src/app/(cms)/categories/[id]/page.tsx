import EditCategory from "@/components/cms/entities/category/edit";

interface EditCategoryPageProps {
  params: { id: string };
}

export default function EditCategoryPage({ params }: EditCategoryPageProps) {
  return <EditCategory id={params.id} />;
}
