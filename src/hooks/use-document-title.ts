import { useEffect } from "react";
import { brand, formatDocumentTitle } from "@/config/brand";

export function useDocumentTitle(page: string): void {
  useEffect(() => {
    document.title = formatDocumentTitle(page);
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", brand.tagline);
  }, [page]);
}
