import ImageTile from "./image-tile";

export default function ImageGrid({ images }: { images: string[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {images.map((url, i) => (
        <ImageTile key={i} url={url} />
      ))}
    </div>
  );
}
