export interface Article {
  seq: number;
  url: string;
  title: string;
  date: string;
  content: string;
  domain: string;
  created_at: string;
  keywords?: Keyword[];
}

export interface Keyword {
  keyword: string;
  frequency: number;
}

export interface TopKeyword extends Keyword {
  total_frequency: number;
  related_articles: RelatedArticle[];
}

export interface RelatedArticle {
  title: string;
  url: string;
  date: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
