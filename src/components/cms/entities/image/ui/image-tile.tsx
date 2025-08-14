import Image from "next/image";
import ImageEditor from "../editor";

export default function ImageTile({ url }: { url: string }) {
  return (
    <div className="border rounded p-2">
      <Image
        src={url}
        alt="Uploaded"
        width={200}
        height={200}
        className="object-contain w-full h-auto"
      />
      <ImageEditor imageUrl={url} onDelete={() => location.reload()} />
    </div>
  );
}
