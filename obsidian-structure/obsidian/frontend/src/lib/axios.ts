import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { auth } from "./firebase";

// ─── Base Config ──────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const REQUEST_TIMEOUT = 30_000;

// ─── Axios Instance ───────────────────────────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ─── Request Interceptor — Attach Firebase JWT ────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken(/* forceRefresh */ false);
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("[axios] Failed to attach auth token:", error);
    }
    return config;
  },
  (error) => {
    console.error("[axios] Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// ─── Response Interceptor — Handle Token Expiry & Errors ─────────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Token expired — force refresh and retry once
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const user = auth.currentUser;
        if (user) {
          const freshToken = await user.getIdToken(/* forceRefresh */ true);
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error("[axios] Token refresh failed:", refreshError);
        // Let auth store handle sign-out
        window.dispatchEvent(new CustomEvent("obsidian:auth:expired"));
      }
    }

    // Rate limit
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers["retry-after"];
      console.warn(`[axios] Rate limited. Retry after ${retryAfter}s`);
    }

    // Network error
    if (!error.response) {
      console.error("[axios] Network error — no response received:", error.message);
    }

    return Promise.reject(error);
  }
);

// ─── Typed Request Helpers ────────────────────────────────────────────────────

export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.get<T>(url, config);
  return response.data;
}

export async function apiPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.post<T>(url, data, config);
  return response.data;
}

export async function apiPatch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.patch<T>(url, data, config);
  return response.data;
}

export async function apiPut<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.put<T>(url, data, config);
  return response.data;
}

export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.delete<T>(url, config);
  return response.data;
}

export default apiClient;
