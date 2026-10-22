import axios from 'axios';



const authAPI = axios.create({
    baseURL: "http://127.0.0.1:5000/api", withCredentials: true,
});


const handleResponse = (response) => response;
const handleError = (error) => {
    if (error.response?.status === 401) {
        localStorage.removeItem('user');
        window.location.href = '/auth';
    }
    console.error('API Error:', error);
    return Promise.reject(error);
};





authAPI.interceptors.response.use(handleResponse, handleError);

// authAPI.interceptors.request.use((config) => {
authAPI.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    } else {

    }
    return config;
});




export const registerUser = (phone_number) => {
  return authAPI.post("/auth/send-otp/", { phone_number });
};


export const verifyOTP = (token, otp) => {
  return authAPI.post("/auth/verify-otp/", { token, otp });
}

export const fetchSports = () => {
  return authAPI.get("/services/");
};

export const fetchAllTimeSlots = () => {
  return authAPI.get('/time-slots/');
};


export const fetchAvailableTimeSlots = (date, config = {}) => {
  return authAPI.get(`/time-slots/available/${date}`, config);
};

export const fetchMyBookings = () => {
  return authAPI.get("/my-bookings/");
};