import { fetcher, post } from './config';

export const loginApi = async (credentials) => {
  try {
    return await post('/api/auth/login/', credentials);
  } catch (error) {
    if (error.status === 401) {
      throw new Error('Nieprawidłowy login lub hasło');
    }
    throw error;
  }
};

export const logoutApi = async () => {
  return post('/api/auth/logout/');
};

export const fetchMe = async () => {
  return fetcher('/api/auth/me/');
};