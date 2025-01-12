import axios from 'axios';
import axiosRetry from 'axios-retry';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000 // 60초 타임아웃
});

// 재시도 설정
axiosRetry(api, { 
  retries: 3,
  retryDelay: (retryCount) => {
    return retryCount * 1000; // 1초, 2초, 3초 간격으로 재시도
  },
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           error.code === 'ECONNABORTED';
  }
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
    console.error('API Error:', error);
    if (error.response) {
      throw error.response.data;
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Server is starting up, please try again in a moment...');
    }
    throw new Error(error.message || 'Network error occurred');
  }
};

export const getRecentArticles = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await api.get<ApiResponse<any>>('/api/articles/recent');
    return response.data;
  } catch (error: any) {
    console.error('API Error:', error);
    if (error.response) {
      throw error.response.data;
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Server is starting up, please try again in a moment...');
    }
    throw new Error(error.message || 'Network error occurred');
  }
};

export const getTopKeywords = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await api.get<ApiResponse<any>>('/api/keywords/top');
    return response.data;
  } catch (error: any) {
    console.error('API Error:', error);
    if (error.response) {
      throw error.response.data;
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Server is starting up, please try again in a moment...');
    }
    throw new Error(error.message || 'Network error occurred');
  }
};

export const getRelatedArticles = async (keyword: string): Promise<ApiResponse<any>> => {
  try {
    const response = await api.get<ApiResponse<any>>(`/api/keywords/${keyword}/articles`);
    return response.data;
  } catch (error: any) {
    console.error('API Error:', error);
    if (error.response) {
      throw error.response.data;
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Server is starting up, please try again in a moment...');
    }
    throw new Error(error.message || 'Network error occurred');
  }
};
