import axios from 'axios';
import { Article, TopKeyword, RelatedArticle, ApiResponse } from '../types';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const articleApi = {
  addArticle: async (url: string): Promise<ApiResponse<{ article: Article; keywords: TopKeyword[] }>> => {
    const response = await api.post<ApiResponse<{ article: Article; keywords: TopKeyword[] }>>('/articles', { url });
    return response.data;
  },

  getRecentArticles: async (days: number = 7, limit: number = 10): Promise<ApiResponse<Article[]>> => {
    const response = await api.get<ApiResponse<Article[]>>('/articles/recent', {
      params: { days, limit },
    });
    return response.data;
  },

  searchArticles: async (params: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ApiResponse<Article[]>> => {
    const response = await api.get<ApiResponse<Article[]>>('/articles/search', { params });
    return response.data;
  },
};

export const keywordApi = {
  getTopKeywords: async (days: number = 7): Promise<ApiResponse<TopKeyword[]>> => {
    const response = await api.get<ApiResponse<TopKeyword[]>>('/keywords/top', {
      params: { days },
    });
    return response.data;
  },

  getRelatedArticles: async (
    keyword: string,
    limit: number = 5
  ): Promise<ApiResponse<RelatedArticle[]>> => {
    const response = await api.get<ApiResponse<RelatedArticle[]>>('/keywords/' + keyword + '/articles', {
      params: { limit },
    });
    return response.data;
  },
};
