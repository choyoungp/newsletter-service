import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const addArticle = async (url: string): Promise<ApiResponse<any>> => {
  const response = await axios.post<ApiResponse<any>>(`${API_URL}/api/articles`, { url });
  return response.data;
};

export const getRecentArticles = async (): Promise<ApiResponse<any>> => {
  const response = await axios.get<ApiResponse<any>>(`${API_URL}/api/articles/recent`);
  return response.data;
};

export const getTopKeywords = async (): Promise<ApiResponse<any>> => {
  const response = await axios.get<ApiResponse<any>>(`${API_URL}/api/keywords/top`);
  return response.data;
};

export const getRelatedArticles = async (keyword: string): Promise<ApiResponse<any>> => {
  const response = await axios.get<ApiResponse<any>>(`${API_URL}/api/keywords/${keyword}/articles`);
  return response.data;
};
