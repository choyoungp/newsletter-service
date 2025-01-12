import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30초 타임아웃
});

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const addArticle = async (url: string): Promise<ApiResponse<any>> => {
  try {
    const response = await api.post<ApiResponse<any>>('/api/articles', { url });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw error.response.data;
    }
    throw new Error('Network error occurred');
  }
};

export const getRecentArticles = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await api.get<ApiResponse<any>>('/api/articles/recent');
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw error.response.data;
    }
    throw new Error('Network error occurred');
  }
};

export const getTopKeywords = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await api.get<ApiResponse<any>>('/api/keywords/top');
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw error.response.data;
    }
    throw new Error('Network error occurred');
  }
};

export const getRelatedArticles = async (keyword: string): Promise<ApiResponse<any>> => {
  try {
    const response = await api.get<ApiResponse<any>>(`/api/keywords/${keyword}/articles`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw error.response.data;
    }
    throw new Error('Network error occurred');
  }
};
