/**
 * Determine the application's base URL based on environment variables.
 *
 * @returns The base URL: `https://{VERCEL_URL}` if `VERCEL_URL` is set; otherwise the value of `NEXT_PUBLIC_APP_URL` if set; otherwise `http://localhost:3000`.
 */
export function getBaseUrl(): string {
  // Vercel provides VERCEL_URL for preview/production deployments
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Allow explicit override via environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Default to localhost for development
  return "http://localhost:3000";
}

/**
 * Create a URL-safe slug from the given text.
 *
 * @returns The resulting slug: lowercased, with non-alphanumeric sequences replaced by single hyphens, leading and trailing hyphens removed, and truncated to 50 characters.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}