// Pusta baza = same-origin, requesty /api/* idą przez proxy Vite na Django.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

// Czytane przy każdym requeście, bo login() po stronie Django rotuje token CSRF.
export const getCsrfToken = () =>
  document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/)?.[1] ?? '';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// Tu 401 to nie wygasła sesja, tylko złe hasło / niezalogowany gość na wejściu.
const SKIP_SESSION_EXPIRED = ['/api/auth/login/', '/api/auth/me/'];

let onSessionExpired = () => {};

export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn; };

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// DRF zwraca {"detail": ...} lub {"pole": [...]}, ale odrzucone CSRF to HTML Django.
const readErrorMessage = async (response, fallback) => {
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') return data.detail;
    const [field, value] = Object.entries(data ?? {})[0] ?? [];
    if (field) return `${field}: ${Array.isArray(value) ? value[0] : value}`;
  } catch {
    // brak ciała albo odpowiedź nie w JSON
  }
  return fallback;
};

export const apiFetch = async (endpoint, { method = 'GET', body, headers, ...rest } = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(SAFE_METHODS.includes(method) ? {} : { 'X-CSRFToken': getCsrfToken() }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...rest,
  });

  if (response.ok) {
    return response.status === 204 ? null : response.json();
  }

  if (response.status === 401 && !SKIP_SESSION_EXPIRED.includes(endpoint.split('?')[0])) {
    onSessionExpired();
    throw new ApiError('Sesja wygasła - zaloguj się ponownie.', 401);
  }

  if (response.status === 403) {
    throw new ApiError(await readErrorMessage(response, 'Brak uprawnień do tej operacji.'), 403);
  }

  throw new ApiError(await readErrorMessage(response, `Błąd serwera (${response.status}).`), response.status);
};

export const get = (endpoint) => apiFetch(endpoint);
export const post = (endpoint, body) => apiFetch(endpoint, { method: 'POST', body });
export const patch = (endpoint, body) => apiFetch(endpoint, { method: 'PATCH', body });
export const del = (endpoint) => apiFetch(endpoint, { method: 'DELETE' });

export const fetcher = get;
