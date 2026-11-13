const LOCAL_API_URL = 'http://localhost:3000/api';
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const normalizedApiUrl = configuredApiUrl?.replace(/\/+$/, '');

export const API_BASE_URL = normalizedApiUrl || LOCAL_API_URL;
