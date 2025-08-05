import { Metadata } from "next";
import SaleGroupList from "@/components/cms/entities/sale-group/list";

export const metadata: Metadata = {
  title: "קבוצות מבצע",
};

export default function SaleGroupsPage() {
  return (
      <SaleGroupList />
  );
}
