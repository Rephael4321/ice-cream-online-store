import { ProductImage } from "../list";
import ImageCard from "./image-card";

export default function ImageGrid({ images }: { images: ProductImage[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {images.map((img) => (
        <ImageCard key={img.key} image={img} />
      ))}
    </div>
  );
}
