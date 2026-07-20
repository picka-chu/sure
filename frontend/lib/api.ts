import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

export function getApiBase(): string {
  if (typeof window !== "undefined" && (window as any).__API_URL__) {
    return (window as any).__API_URL__;
  }
  return "http://localhost:8000";
}

let apiInstance: AxiosInstance | null = null;

function getApi(): AxiosInstance {
  if (!apiInstance) {
    apiInstance = axios.create({
      headers: { "Content-Type": "application/json" },
    });

    apiInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      config.baseURL = getApiBase();
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

    apiInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (!error.response) {
          console.error("Network error — check your connection");
          return Promise.reject(new Error("Network error. Please check your connection."));
        }
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
  }
  return apiInstance;
}

const api = getApi();

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
  capture: (file: File, bank_name?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (bank_name) formData.append("bank_name", bank_name);
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

let adminApiInstance: AxiosInstance | null = null;

function getAdminApi(): AxiosInstance {
  if (!adminApiInstance) {
    adminApiInstance = axios.create();
    adminApiInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      config.baseURL = getApiBase();
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    adminApiInstance.interceptors.response.use(
      (r) => r,
      (error) => {
        if (error.response?.status === 401 && typeof window !== "undefined") {
          localStorage.removeItem("admin_token");
          localStorage.removeItem("admin_user");
          window.location.href = "/admin/login";
        }
        return Promise.reject(error);
      }
    );
  }
  return adminApiInstance;
}

const adminApi = getAdminApi();

export const adminApiClient = {
  login: (data: { email: string; password: string }) =>
    api.post("/api/auth/admin/login", data),
  dashboard: () => adminApi.get("/api/admin/dashboard"),
  businesses: (params?: { search?: string; status?: string; limit?: number; offset?: number }) =>
    adminApi.get("/api/admin/businesses", { params }),
  getBusiness: (id: string) => adminApi.get(`/api/admin/businesses/${id}`),
  toggleBusiness: (id: string) => adminApi.put(`/api/admin/businesses/${id}/toggle`),
  payments: (params?: { status?: string; limit?: number; offset?: number }) =>
    adminApi.get("/api/admin/payments", { params }),
  verifyPayment: (id: string, data: { status: string; admin_notes?: string }) =>
    adminApi.put(`/api/admin/payments/${id}/verify`, data),
  verifications: (params?: { status?: string; limit?: number; offset?: number }) =>
    adminApi.get("/api/admin/verifications", { params }),
  staff: (params?: { limit?: number; offset?: number }) =>
    adminApi.get("/api/admin/staff", { params }),
};
