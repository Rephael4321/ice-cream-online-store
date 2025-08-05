import { Metadata } from "next";
import ViewSaleGroup from "@/components/cms/entities/sale-group/view";

export const metadata: Metadata = {
  title: "צפייה בקבוצת מבצע",
};

export default function SaleGroupDetailsPage() {
  return <ViewSaleGroup />;
}
