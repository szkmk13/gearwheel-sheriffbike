import { fetcher, API_BASE_URL, getCsrfToken } from './config';

export const loginApi = async (credentials) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify(credentials),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Nieprawidłowy login lub hasło');
  }
  return response.json();
};

export const logoutApi = async () => {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout/`, {
    method: 'POST',
    headers: { 'X-CSRFToken': getCsrfToken() },
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Błąd wylogowania');
};

export const fetchMe = async () => {
  return fetcher('/api/auth/me/');
};