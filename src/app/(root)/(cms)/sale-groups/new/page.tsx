import { Metadata } from "next";
import NewSaleGroupForm from "@/components/cms/entities/sale-group/new";

export const metadata: Metadata = {
  title: "קבוצה חדשה | קבוצות מבצע",
};

export default function NewSaleGroupPage() {
  return <NewSaleGroupForm />;
}
