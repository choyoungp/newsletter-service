import axios from 'axios';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const articleApi = {
  addArticle: async (url: string): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>('/api/articles', { url });
    return response.data;
  },

  getRecentArticles: async (): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>('/api/articles/recent');
    return response.data;
  },
};

export const keywordApi = {
  getTopKeywords: async (): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>('/api/keywords/top');
    return response.data;
  },

  getRelatedArticles: async (keyword: string): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>(`/api/keywords/${keyword}/articles`);
    return response.data;
  },
};
