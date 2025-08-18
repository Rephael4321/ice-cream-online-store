import { ProductImage } from "../list";
import Image from "next/image";

export default function ImageCard({ image }: { image: ProductImage }) {
  return (
    <div className="border rounded p-2 bg-white shadow-sm hover:shadow-md transition">
      {/* Fixed container */}
      <div className="relative w-full h-40 flex items-center justify-center bg-gray-50">
        <Image
          src={image.url}
          alt={image.key}
          fill
          className="object-contain rounded"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      </div>
      <div className="mt-2 text-sm">
        <p className="truncate">{image.key}</p>
        <p className="text-xs text-gray-500">
          {image.size ? `${(image.size / 1024).toFixed(1)} KB` : "-"}
        </p>
        <p className="text-red-600">לא בשימוש</p>
      </div>
    </div>
  );
}
