// Backend API base URL. Defaults to a same-origin "/api" (the normal case:
// Django serves the SPA shell and the API on the same host). Override
// VITE_API_URL with just the backend's origin (e.g. http://localhost:8000)
// when running the frontend standalone (`npm run dev` with no Django in
// front of it), so requests go straight to a separately running Django dev
// server instead of the Vite dev server, which can't serve them. The "/api"
// suffix is always appended here - don't include it in VITE_API_URL.
const backendOrigin = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
export const API_BASE = `${backendOrigin}/api`;
