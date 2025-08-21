import { ProductImage } from "../list";
import Image from "next/image";
import Link from "next/link";

export default function ImageCard({ image }: { image: ProductImage }) {
  const displayName =
    (image as any).name ?? image.key.split("/").pop() ?? image.key;

  return (
    <Link
      href={`/new-product?image=${encodeURIComponent(image.url)}`}
      className="block"
    >
      <div className="border rounded p-2 bg-white shadow-sm hover:shadow-md transition cursor-pointer">
        <div className="relative w-full h-40 flex items-center justify-center bg-gray-50">
          <Image
            src={image.url}
            alt={displayName}
            fill
            unoptimized // ✅ disables Next.js optimization for these images
            className="object-contain rounded"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>
        <div className="mt-2 text-sm">
          <p className="truncate font-medium" title={displayName}>
            {displayName}
          </p>
          <p className="text-[11px] text-gray-500 truncate" title={image.key}>
            {image.key}
          </p>
          <p className="text-[11px] text-gray-500">
            {image.size ? `${(image.size / 1024).toFixed(1)} KB` : "-"}
          </p>
        </div>
      </div>
    </Link>
  );
}
