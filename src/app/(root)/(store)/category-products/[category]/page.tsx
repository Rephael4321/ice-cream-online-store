import ProductsByCategory, {
  Props as ProductsByCategoryProps,
} from "@/components/store/products-by-category";

export default async function ProductsByCategoryPage({
  params,
}: ProductsByCategoryProps) {
  return <ProductsByCategory params={params} />;
}
