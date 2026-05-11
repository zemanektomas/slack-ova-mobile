import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';

const baseURL =
  (Constants.expoConfig?.extra as any)?.apiBaseUrl ?? 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${baseURL}/api/v1`,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const jwt = useAuthStore.getState().jwt;
  if (jwt) {
    config.headers.Authorization = `Bearer ${jwt}`;
  }
  return config;
});
