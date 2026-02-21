"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/cms/ui";

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") || "");

  const isSearchPage = pathname === "/search-products";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search-products?query=${encodeURIComponent(trimmed)}`);
  };

  // Auto go back if user clears the search input
  useEffect(() => {
    if (isSearchPage && query.trim() === "") {
      router.back();
    }
  }, [query, isSearchPage, router]);

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl mx-auto mb-4 flex items-center gap-2"
    >
      <Input
        type="text"
        placeholder="חיפוש מוצר..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1"
      />
      <button
        type="submit"
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
      >
        חפש
      </button>
    </form>
  );
}
