import Image from "next/image";
import ImageEditor from "../editor";

export default function ImageTile({ url }: { url: string }) {
  return (
    <div className="border rounded-xl p-2 shadow-sm hover:shadow transition">
      <div className="relative w-full overflow-hidden rounded-lg bg-gray-50">
        {/* יחס קבוע לרספונסיביות נחמדה */}
        <div className="aspect-[1/1] w-full">
          <Image
            src={url}
            alt="תמונה שהועלתה"
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
            className="object-contain"
            loading="lazy"
          />
        </div>
      </div>
      <ImageEditor imageUrl={url} onDelete={() => window.location.reload()} />
    </div>
  );
}
