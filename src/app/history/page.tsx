import type { Metadata } from "next";
import { HistoryTable } from "@/components/dashboard/HistoryTable";

export const metadata: Metadata = {
  title: "Cleaning history",
};

export default function HistoryPage() {
  return <HistoryTable />;
}
