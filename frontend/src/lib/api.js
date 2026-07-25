// Relative by default: the page is always served by the same Django host
// that serves the API, so same-origin requests avoid CORS entirely
// (localhost vs 127.0.0.1 are different origins to the browser even
// though they're the same server). Override via VITE_API_BASE_URL only
// if the API is genuinely on a different host.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

let refreshPromise = null;

const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

function isAuthPath(path) {
  return path.startsWith('/api/auth/');
}

function getCookie(name) {
  const match = document.cookie.match('(^|;\\s*)' + name + '=([^;]*)');
  return match ? decodeURIComponent(match[2]) : null;
}

async function doFetch(path, options) {
  const method = (options && options.method || 'GET').toUpperCase();
  const csrfToken = UNSAFE_METHODS.includes(method) ? getCookie('csrftoken') : null;

  return fetch(API_BASE_URL + path, {
    credentials: 'include',
    ...options,
    headers: {
      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      ...(options && options.headers),
    },
  });
}

function refreshToken() {
  if (!refreshPromise) {
    refreshPromise = doFetch('/api/auth/token/refresh/', { method: 'POST' })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Fetch wrapper around the backend API.
 * - Prepends the API base URL.
 * - Always sends credentials (httpOnly auth cookies).
 * - On a 401 for a non-auth endpoint, attempts a single token refresh and retries once.
 */
async function apiFetch(path, options = {}) {
  let response = await doFetch(path, options);

  if (response.status === 401 && !isAuthPath(path)) {
    const refreshResponse = await refreshToken();
    if (refreshResponse.ok) {
      response = await doFetch(path, options);
    }
  }

  return response;
}

export { API_BASE_URL, apiFetch };
