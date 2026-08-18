export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetcher = async (endpoint) => {
  console.log(`[API GET] Fetching: ${endpoint}`);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    console.error(`[API ERROR] ${response.status} at ${endpoint}`);
    throw new Error(`Błąd API: ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return null; 
  }

  return response.json();
};