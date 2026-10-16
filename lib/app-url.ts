// Absolute base URL of the deployed app, used for share links, link-preview
// images and emails. Prefers APP_URL, then Vercel's production URL, then
// localhost for local development.
export function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
