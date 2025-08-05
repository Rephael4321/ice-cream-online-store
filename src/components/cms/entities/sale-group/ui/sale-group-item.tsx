"use client";

import Image from "next/image";
import { Button } from "@/components/cms/ui/button";
import { Trash2 } from "lucide-react";

interface SaleGroupItemProps {
  id: number;
  name: string;
  price: number;
  image?: string | null;
  onRemove?: (productId: number) => void;
}

export function SaleGroupItem({
  id,
  name,
  price,
  image,
  onRemove,
}: SaleGroupItemProps) {
  return (
    <div className="flex items-center justify-between p-2 border rounded-xl shadow-sm bg-white">
      <div className="flex items-center gap-3">
        {image && (
          <Image
            src={image}
            alt={name}
            width={48}
            height={48}
            className="rounded-md object-cover border"
          />
        )}
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-gray-500">₪{price}</p>
        </div>
      </div>

      {onRemove && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRemove(id)}
          title="הסר מהמכירה"
        >
          <Trash2 className="inline-block align-middle mr-1" />
          הסר
        </Button>
      )}
    </div>
  );
}
