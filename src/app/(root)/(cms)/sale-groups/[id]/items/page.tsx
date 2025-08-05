import { Metadata } from "next";
import SaleGroupItemManager from "@/components/cms/entities/sale-group/items";

export const metadata: Metadata = {
  title: "מוצרים בקבוצת מבצע",
};

export default function SaleGroupItemsPage() {
  return <SaleGroupItemManager />;
}
