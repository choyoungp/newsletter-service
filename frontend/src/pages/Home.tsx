import React, { useState, useEffect } from 'react';
import { Container, Typography, TextField, Button, Box, Card, CardContent, Grid, CircularProgress, Alert } from '@mui/material';
import { addArticle, getRecentArticles, getTopKeywords } from '../services/api';

interface Article {
  seq: number;
  url: string;
  title: string;
  date: string;
  domain: string;
  keywords: Array<{
    keyword: string;
    frequency: number;
  }>;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [topKeywords, setTopKeywords] = useState<Array<{
    keyword: string;
    total_frequency: number;
    related_articles: Array<{
      title: string;
      url: string;
      date: string;
    }>;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecentArticles();
    fetchTopKeywords();
  }, []);

  const fetchRecentArticles = async () => {
    try {
      const response = await getRecentArticles();
      if (response?.data) {
        setArticles(response.data);
      }
    } catch (err: any) {
      console.error('Error fetching articles:', err);
      setError(err?.response?.data?.message || 'Failed to fetch articles');
    }
  };

  const fetchTopKeywords = async () => {
    try {
      const response = await getTopKeywords();
      if (response?.data) {
        setTopKeywords(response.data);
      }
    } catch (err: any) {
      console.error('Error fetching keywords:', err);
      setError(err?.response?.data?.message || 'Failed to fetch keywords');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError('');

    try {
      const response = await addArticle(url);
      console.log('Add article response:', response);
      
      if (response?.success) {
        setUrl('');
        await fetchRecentArticles();
        await fetchTopKeywords();
      } else {
        throw new Error(response?.message || 'Failed to add article');
      }
    } catch (err: any) {
      console.error('Error adding article:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to add article');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Newsletter Service
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                label="Article URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                error={!!error}
                helperText={error}
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
        </form>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={4} sx={{ mt: 4 }}>
          <Grid item xs={12} md={8}>
            <Typography variant="h5" gutterBottom>
              Recent Articles
            </Typography>
            {articles.map((article) => (
              <Card key={article.seq} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" component="h2">
                    {article.title}
                  </Typography>
                  <Typography color="text.secondary" gutterBottom>
                    {new Date(article.date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" component="p">
                    Keywords: {article.keywords.map(k => k.keyword).join(', ')}
                  </Typography>
                  <Button
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ mt: 1 }}
                  >
                    Read More
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="h5" gutterBottom>
              Top Keywords
            </Typography>
            {topKeywords.map((keyword) => (
              <Card key={keyword.keyword} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" component="h2">
                    {keyword.keyword}
                  </Typography>
                  <Typography color="text.secondary" gutterBottom>
                    Frequency: {keyword.total_frequency}
                  </Typography>
                  <Typography variant="body2" component="p">
                    Related Articles:
                  </Typography>
                  {keyword.related_articles.map((article, index) => (
                    <Typography key={index} variant="body2" component="p">
                      • <a href={article.url} target="_blank" rel="noopener noreferrer">
                          {article.title}
                        </a>
                    </Typography>
                  ))}
                </CardContent>
              </Card>
            ))}
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
