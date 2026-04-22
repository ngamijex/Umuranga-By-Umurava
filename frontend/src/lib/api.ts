import axios from "axios";

/** Normalized API base (no trailing slash). Use for `fetch` / links so env is never `undefined` in the client bundle. */
export const publicApiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const api = axios.create({
  baseURL: publicApiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("umuranga_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("umuranga_token");
    }
    return Promise.reject(error);
  }
);

export default api;
