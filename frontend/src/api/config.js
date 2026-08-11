export const API_BASE_URL = 'http://localhost:8000';

export const fetcher = async (endpoint) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'omit', //Zmie
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Błąd API: ${response.status} ${response.statusText}`);
  }


  if (response.status === 204) {
    return null; 
  }

  return response.json();
};