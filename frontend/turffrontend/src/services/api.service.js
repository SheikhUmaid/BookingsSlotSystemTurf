import axios from 'axios';



// Turf backend API, e.g. https://api.yourturf.com/api (set in .env as VITE_API_URL).
// Falls back to the local backend for development.
export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");

const authAPI = axios.create({
    baseURL: API_URL, withCredentials: true,
});


const handleResponse = (response) => response;
const handleError = (error) => {
    // if (error.response?.status === 401) {
    //     localStorage.removeItem('user');
    //     window.location.href = '/auth';
    // }
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




export const sendOtp = (phone) => {
  return authAPI.post("/auth/send-otp/", { phone });
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

export const verifyCoupon = (coupon) => {
  return authAPI.get(`/coupons/${coupon}`);
};


// Public venue licence: { bookingEnabled, blocked, plan, features }
export const fetchLicence = () => {
  return authAPI.get("/licence");
};

// Public turf details: { venue: { name, tagline, full_address, opening_hours, directions_url, ... } }
export const fetchVenue = () => {
  return authAPI.get("/venue");
};

export const fetchPitches = () => {
  return authAPI.get("/pitches/");
};

// Availability is per pitch: a slot is unique per (pitch, date)
export const fetchAvailableTimeSlots = (date, pitch, config = {}) => {
  return authAPI.get(`/time-slots/available/${date}`, {
    ...config,
    params: { ...(config.params || {}), ...(pitch ? { pitch } : {}) },
  });
};

export const fetchMyBookings = () => {
  return authAPI.get("/my-bookings/");
};

export const createBooking = (data) =>  {
  return authAPI.post(`/bookings/`, data)

}
export const getBooking = (data) =>  {
  return authAPI.get(`/bookings/`)

}

export const createOrder = (data) =>  {
  return authAPI.post(`/payments/create-order/`, data)
  
}

export const paymentWebhook = (data)=>{
  return authAPI.post(`/payments/razorpay-webhook/`, data)

}

export const getUser = ()=>{
  return authAPI.get("/profile")
}

export const patchUser = (newData)=>{
  return authAPI.patch("/profile", newData);

}