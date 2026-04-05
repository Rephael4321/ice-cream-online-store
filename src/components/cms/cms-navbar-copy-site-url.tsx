"use client";

import { toast } from "sonner";

type CmsNavbarCopySiteUrlProps = {
  className: string;
};

export default function CmsNavbarCopySiteUrl({
  className,
}: CmsNavbarCopySiteUrlProps) {
  async function copy() {
    const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    const url = raw ? raw.replace(/\/$/, "") : "";
    if (!url) {
      toast.error("לא הוגדרה NEXT_PUBLIC_SITE_URL בסביבה");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("הקישור הועתק ללוח");
    } catch {
      toast.error("לא ניתן להעתיק ללוח");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={`${className} cursor-pointer border-0 bg-transparent p-0 m-0 font-inherit`}
    >
      קישור
    </button>
  );
}
