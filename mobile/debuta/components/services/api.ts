import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

function getBaseUrl(): string {
  // Si hay URL en .env la usa (producción)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL + '/api';
  }
  // En desarrollo toma la IP de Metro automáticamente
  const host =
    Constants.expoConfig?.hostUri?.split(':')[0] ||
    (Constants.manifest as any)?.debuggerHost?.split(':')[0];

  if (host) return `http://${host}:3000/api`;
  return 'http://localhost:3000/api';
}

const BASE_URL = getBaseUrl();
console.log('🌐 API URL:', BASE_URL); // para verificar que toma la IP correcta

// Headers extra cuando se usa localtunnel (bypass interstitial)
const tunnelHeaders = BASE_URL.includes('loca.lt')
  ? { 'bypass-tunnel-reminder': 'true' }
  : {};

class ApiClient {
  private client: AxiosInstance;
  private uploadClient: AxiosInstance;

  constructor(baseUrl: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 15000, // 15s para peticiones JSON normales
      headers: { 'Content-Type': 'application/json', ...tunnelHeaders },
    });

    // Cliente especial para uploads — timeout generoso de 90s
    // No se fija Content-Type aquí; cada método lo establece según necesite
    this.uploadClient = axios.create({
      baseURL: baseUrl,
      timeout: 90000,
      headers: { ...tunnelHeaders },
    });

    // Interceptor de auth para el cliente JSON
    this.client.interceptors.request.use(async (config) => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (token) config.headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.warn('Error al obtener token:', error);
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        const data = error.response?.data;
        // Backend de registro devuelve { errores: [...] }, otros usan message/error/detail
        const erroresArray = Array.isArray(data?.errores) ? data.errores[0] : null;
        return Promise.reject({
          status,
          message: erroresArray || data?.message || data?.error || data?.detail || error.message,
          data,
        });
      }
    );

    // Interceptor de auth para el cliente de uploads
    this.uploadClient.interceptors.request.use(async (config) => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (token) config.headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.warn('Error al obtener token:', error);
      }
      return config;
    });

    this.uploadClient.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        const data = error.response?.data;
        const erroresArray = Array.isArray(data?.errores) ? data.errores[0] : null;
        return Promise.reject({
          status,
          message: erroresArray || data?.message || data?.error || data?.detail || error.message,
          data,
        });
      }
    );
  }

  async get<T = any>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.get<T>(path, config);
    return res.data;
  }

  async post<T = any>(path: string, body: object, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.post<T>(path, body, config);
    return res.data;
  }

  async put<T = any>(path: string, body: object, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.put<T>(path, body, config);
    return res.data;
  }

  /** PUT con timeout extendido (90 s) — usar para subidas de imágenes en base64 */
  async putLong<T = any>(path: string, body: object, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.uploadClient.put<T>(path, body, {
      ...config,
      headers: { 'Content-Type': 'application/json', ...(config?.headers ?? {}) },
    });
    return res.data;
  }

  async patch<T = any>(path: string, body: object, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.patch<T>(path, body, config);
    return res.data;
  }

  async delete<T = any>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.delete<T>(path, config);
    return res.data;
  }

  async postForm<T = any>(path: string, formData: FormData): Promise<T> {
    const res = await this.uploadClient.post<T>(path, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }

  async uploadFile<T = any>(
    path: string,
    file: { uri: string; name: string; type: string },
    field = 'file'
  ): Promise<T> {
    const formData = new FormData();
    formData.append(field, { uri: file.uri, name: file.name, type: file.type } as any);
    const res = await this.uploadClient.post<T>(path, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }

  async uploadFiles<T = any>(
    path: string,
    files: { uri: string; name: string; type: string }[],
    field = 'files'
  ): Promise<T> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append(field, { uri: file.uri, name: file.name, type: file.type } as any);
    });
    const res = await this.uploadClient.post<T>(path, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }
}

export const api = new ApiClient(BASE_URL);
export { ApiClient };