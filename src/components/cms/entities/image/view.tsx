"use client";

import { useEffect, useState } from "react";
import UploadImage from "./upload";
import ImageGrid from "./ui/image-grid";

export default function ViewImages() {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/images") // you'll implement this next
      .then((res) => res.json())
      .then((data) => setImages(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 space-y-4">
      <UploadImage onUpload={() => location.reload()} />
      {loading ? <p>Loading...</p> : <ImageGrid images={images} />}
    </div>
  );
}
