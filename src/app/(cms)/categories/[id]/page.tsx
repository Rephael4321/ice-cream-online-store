import EditCategory from "@/components/cms/edit-category";

interface EditCategoryPageProps {
  params: { id: string };
}

export default function EditCategoryPage({ params }: EditCategoryPageProps) {
  return <EditCategory id={params.id} />;
}
