import { Metadata } from "next";
import ViewStorageAreas from "@/components/cms/entities/storage/view-areas";

export const metadata: Metadata = {
  title: "ניהול אזורי אחסון",
};

export default function StorageAreasPage() {
  return <ViewStorageAreas />;
}
