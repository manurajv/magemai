/**
 * Public booking page from the blueprint (`/business/:slug`) on the assigned
 * Hosting hostname. Phase 1 does not register that route yet. `/business/register`
 * stays a static path so this slug route cannot capture the word `register`.
 */
export const BOOKING_PAGE_ORIGIN = "https://magemai.web.app";

export function bookingPageUrl(slug: string): string {
  return `${BOOKING_PAGE_ORIGIN}/business/${slug.trim().toLowerCase()}`;
}
