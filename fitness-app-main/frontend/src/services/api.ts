import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('session_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear token on unauthorized
      await SecureStore.deleteItemAsync('session_token');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  getSessionData: (sessionId: string) =>
    api.get('/auth/session-data', { headers: { 'X-Session-ID': sessionId } }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post(`/auth/change-password?old_password=${oldPassword}&new_password=${newPassword}`),
};

// Gym API
export const gymAPI = {
  register: (data: any) => api.post('/gyms/register', data),
  createByAdmin: (data: any, ownerEmail: string, password: string) => 
    api.post(`/gyms/create?owner_email=${ownerEmail}&password=${password}`, data),
  getAllGyms: () => api.get('/gyms/all'),
  getMyGym: () => api.get('/gyms/my-gym'),
  getGymDetails: (gymId: string) => api.get(`/gyms/${gymId}`),
  updateGym: (gymId: string, data: any) => api.put(`/gyms/${gymId}`, data),
  updateSubscription: (gymId: string, plan: string, duration: number) => 
    api.put(`/gyms/${gymId}/subscription?plan=${plan}&duration_days=${duration}`),
  toggleStatus: (gymId: string, isActive: boolean) => 
    api.put(`/gyms/${gymId}/status?is_active=${isActive}`),
  deleteGym: (gymId: string) => api.delete(`/gyms/${gymId}`),
};

// Member API
export const memberAPI = {
  getAllMembers: () => api.get("/members"),
  getAllTrainers: () => api.get("/trainers"),
  addMember: (data) => api.post("/members", data),
  deleteMember: (id) => api.delete(`/members/${id}`),
  assignTrainer: (memberId, trainerId) =>
    api.put(`/members/${memberId}/assign-trainer?trainer_id=${trainerId}`),
  getMyProfile: () => api.get("/members/my-profile"),
  getMemberDetails: (memberId) => api.get(`/members/${memberId}`), // ✅ Added
  extendMembership: (memberId: string, extraDays: number) =>
  api.put(`/members/${memberId}/extend?extra_days=${extraDays}`),

};





// Attendance API
export const attendanceAPI = {
  scan: async (gymId: string) => {
    const token = await SecureStore.getItemAsync('session_token');
    return api.post(`/attendance/scan?gym_id=${gymId}`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  getMyHistory: () => api.get('/attendance/my-history'),
  getGymStats: (date?: string) =>
    api.get('/attendance/gym-stats', {
      params: date ? { date } : {},
    }),
  

};


// Payment API
export const paymentAPI = {
  createOrder: (data: any) => api.post('/payments/create-order', data),
  verifyPayment: (data: any) => api.post('/payments/verify', data),
  getMyPayments: () => api.get('/payments/my-payments'),
  getGymPayments: () => api.get('/payments/gym-payments'), // ✅ Add this line
};


// Workout Plan API
export const workoutAPI = {
  createPlan: (data: any) => api.post('/plans/workout', data),
  getMyPlan: () => api.get('/plans/workout/my-plan'),
};

// Diet Plan API
export const dietAPI = {
  createPlan: (data: any) => api.post('/plans/diet', data),
  getMyPlan: () => api.get('/plans/diet/my-plan'),
};

// Progress API
export const progressAPI = {
  logProgress: (data: any) => api.post('/progress', data),
  getMyHistory: () => api.get('/progress/my-history'),
};

// AI API
export const aiAPI = {
  chat: (data: any) => api.post('/ai/chat', data),
  getChatHistory: () => api.get('/ai/chat-history'),
};

export default api;
