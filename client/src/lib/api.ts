/**
 * When hosting frontend on Vercel and backend on Render, set VITE_API_URL
 * in Vercel to your Render backend URL (e.g. https://your-app.onrender.com).
 * Leave unset for same-origin (frontend and backend together).
 */
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function getApiBase(): string {
  return API_BASE;
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
