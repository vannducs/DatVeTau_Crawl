import axios from "axios";

const API_BASE = "/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (identifier: string, password: string) =>
    api.post("/auth/login", { identifier, password }),

  register: (data: { 
    email: string; 
    password: string; 
    fullName: string; 
    phoneNumber?: string;
    dateOfBirth?: string;
    }) =>api.post("/auth/register", data),

  getMe: () => api.get("/auth/me"),

  updateProfile: (data: {
    fullName?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: string;
  }) => api.put("/auth/profile", data),
};

export default api;
