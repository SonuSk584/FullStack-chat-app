import axios from "axios";

const BASE_URL = import.meta.env.PROD
  ? "https://fullstack-chat-app-4vsj.onrender.com/api"
  : "http://localhost:5001/api";

export const axiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
});