import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Article, TopKeyword } from '../types';
import { articleApi, keywordApi } from '../services/api';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [topKeywords, setTopKeywords] = useState<TopKeyword[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [articlesResponse, keywordsResponse] = await Promise.all([
        articleApi.getRecentArticles(),
        keywordApi.getTopKeywords(),
      ]);

      if (articlesResponse.success && articlesResponse.data) {
        setArticles(articlesResponse.data);
      }

      if (keywordsResponse.success && keywordsResponse.data) {
        setTopKeywords(keywordsResponse.data);
      }
    } catch (err) {
      setError('Failed to fetch initial data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    try {
      setLoading(true);
      setError(null);
      const response = await articleApi.addArticle(url);
      
      if (response.success && response.data) {
        setArticles(prev => [response.data.article, ...prev]);
        setUrl('');
        // Refresh keywords after adding new article
        const keywordsResponse = await keywordApi.getTopKeywords();
        if (keywordsResponse.success && keywordsResponse.data) {
          setTopKeywords(keywordsResponse.data);
        }
      }
    } catch (err) {
      setError('Failed to add article');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Newsletter Service
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={9}>
            <TextField
              fullWidth
              label="Article URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={loading || !url}
              sx={{ height: '56px' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Add Article'}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Typography variant="h5" gutterBottom>
            Recent Articles
          </Typography>
          {articles.map((article) => (
            <Card key={article.seq} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {article.title}
                </Typography>
                <Typography color="text.secondary" gutterBottom>
                  {new Date(article.date).toLocaleDateString()}
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {article.keywords?.map((keyword) => (
                    <Chip
                      key={keyword.keyword}
                      label={keyword.keyword}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
                <Button
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  size="small"
                >
                  Read Article
                </Button>
              </CardContent>
            </Card>
          ))}
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="h5" gutterBottom>
            Top Keywords
          </Typography>
          <Card>
            <CardContent>
              {topKeywords.map((keyword) => (
                <Box key={keyword.keyword} sx={{ mb: 2 }}>
                  <Typography variant="h6">
                    {keyword.keyword} ({keyword.total_frequency})
                  </Typography>
                  <Box sx={{ ml: 2 }}>
                    {keyword.related_articles.map((article) => (
                      <Typography
                        key={article.url}
                        component="a"
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          display: 'block',
                          color: 'text.primary',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                          mb: 1,
                        }}
                      >
                        {article.title}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
