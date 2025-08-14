import ImageTile from "./image-tile";

export default function ImageGrid({ images }: { images: string[] }) {
  return (
    <div
      dir="rtl"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
    >
      {images.map((url, i) => (
        <ImageTile key={i} url={url} />
      ))}
    </div>
  );
}
