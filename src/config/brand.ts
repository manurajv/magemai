export const brand = {
  name: "Magemai",
  endorsement: "A Mavixas product",
  tagline: "Your business. Your own space.",
} as const;

/** Document title template: `{page} · Magemai`. */
export function formatDocumentTitle(page: string): string {
  return `${page} · ${brand.name}`;
}
