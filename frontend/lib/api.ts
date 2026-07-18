import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

function getApiBase(): string {
  if (typeof window !== "undefined" && (window as any).__API_URL__) {
    return (window as any).__API_URL__;
  }
  return "http://localhost:8000";
}

const API_BASE = getApiBase();

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("owner_token") ||
      localStorage.getItem("staff_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("owner_token");
        localStorage.removeItem("staff_token");
        localStorage.removeItem("owner_user");
        localStorage.removeItem("staff_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  register: (data: {
    business_name: string;
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }) => api.post("/api/auth/register", data),

  login: (data: { email: string; password: string }) =>
    api.post("/api/auth/login", data),

  staffLogin: (data: { email: string; pin: string }) =>
    api.post("/api/auth/staff/login", data),
};

export const businessApi = {
  getMe: () => api.get("/api/business/me"),
  update: (data: any) => api.patch("/api/business/me", data),
};

export const banksApi = {
  list: () => api.get("/api/banks"),
  create: (data: any) => api.post("/api/banks", data),
  get: (id: string) => api.get(`/api/banks/${id}`),
  update: (id: string, data: any) => api.patch(`/api/banks/${id}`, data),
  delete: (id: string) => api.delete(`/api/banks/${id}`),
  getSupported: () => api.get("/api/banks/supported/list"),
};

export const staffApi = {
  list: () => api.get("/api/staff"),
  create: (data: any) => api.post("/api/staff", data),
  update: (id: string, data: any) => api.patch(`/api/staff/${id}`, data),
  delete: (id: string) => api.delete(`/api/staff/${id}`),
};

export const verificationApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    api.get("/api/verifications", { params }),
  get: (id: string) => api.get(`/api/verifications/${id}`),
  verifyLink: (data: {
    bank_name: string;
    reference: string;
    account_number?: string;
  }) =>
    api.post("/api/verifications/verify-link", data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
  capture: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/api/verifications/capture", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  staffList: (params?: { limit?: number; offset?: number }) =>
    api.get("/api/verifications/staff", { params }),
  staffToday: () => api.get("/api/verifications/staff/today"),
};

export const analyticsApi = {
  dashboard: () => api.get("/api/analytics/dashboard"),
};

export const subscriptionApi = {
  getStatus: () => api.get("/api/subscription/status"),
  getPricing: () => api.get("/api/subscription/pricing"),
  getPaymentAccounts: () => api.get("/api/subscription/payment-accounts"),
  submitPayment: (formData: FormData) =>
    api.post("/api/subscription/submit-payment", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getPaymentHistory: () => api.get("/api/subscription/payments"),
  getPendingPayments: () => api.get("/api/subscription/admin/pending-payments"),
  verifyPayment: (paymentId: string, data: { status: string; admin_notes?: string }) =>
    api.post(`/api/subscription/admin/verify-payment/${paymentId}`, data),
};
