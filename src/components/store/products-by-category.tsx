import SingleProduct from "@/components/single-product";

interface CategoryRef {
  id: number;
  name: string;
}

interface Sale {
  amount: number;
  price: number;
  fromCategory?: boolean;
  category?: CategoryRef;
}

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  sale?: Sale;
}

interface Props {
  params: { category: string };
}

export default async function ProductsByCategory({ params }: Props) {
  const slug = params.category;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/categories/name/${slug}/products`,
    {
      next: { revalidate: 3600 }, // ISR support
    }
  );

  if (!res.ok) {
    return <div className="p-4 text-red-600">שגיאה בטעינת מוצרים</div>;
  }

  const data = await res.json();
  const products: Product[] = data.products || [];

  if (products.length === 0) {
    return <div className="p-4">לא נמצאו מוצרים בקטגוריה.</div>;
  }

  return (
    <>
      <div className="flex justify-center mt-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-pink-700">
          {decodeURIComponent(slug.replace(/-/g, " "))}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-4 sm:px-8 py-10">
        {products.map((product) => (
          <SingleProduct
            key={product.id}
            id={product.id}
            productImage={product.image || "/ice-scream.png"}
            productName={product.name}
            productPrice={product.price}
            sale={product.sale}
          />
        ))}
      </div>
    </>
  );
}
