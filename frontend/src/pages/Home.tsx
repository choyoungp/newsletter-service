import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, TextField, Button, 
  List, ListItem, ListItemText, CircularProgress,
  Alert, IconButton, ListItemSecondary, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent, Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { addArticle, getRecentArticles, getTopKeywords, deleteArticle } from '../services/api';

interface Article {
  seq: number;
  url: string;
  title: string;
  date: string;
  domain: string;
  keywords: Array<{ keyword: string; frequency: number }>;
}

interface Keyword {
  keyword: string;
  total_frequency: number;
  related_articles: Array<{ title: string; url: string; date: string }>;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);

  useEffect(() => {
    fetchArticles();
    fetchKeywords();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await getRecentArticles();
      setArticles(response.data);
    } catch (error: any) {
      console.error('Error fetching articles:', error);
    }
  };

  const fetchKeywords = async () => {
    try {
      const response = await getTopKeywords();
      setKeywords(response.data);
    } catch (error: any) {
      console.error('Error fetching keywords:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await addArticle(url);
      setUrl('');
      await fetchArticles();
      await fetchKeywords();
    } catch (error: any) {
      console.error('Error adding article:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (article: Article) => {
    setArticleToDelete(article);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!articleToDelete) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await deleteArticle(articleToDelete.seq);
      await fetchArticles();
      await fetchKeywords();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Error deleting article:', error);
      setError(error.message || 'An error occurred while deleting the article');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Newsletter Service
      </Typography>

      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <TextField
          fullWidth
          label="Article URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          error={!!error}
          helperText={error}
          disabled={loading}
          sx={{ mb: 2 }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !url}
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
        >
          Add Article
        </Button>
      </form>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4} sx={{ mt: 4 }}>
        <Grid item xs={12} md={8}>
          <Typography variant="h5" gutterBottom>
            Recent Articles
          </Typography>
          <List>
            {articles.map((article) => (
              <ListItem
                key={article.seq}
                divider
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    aria-label="delete"
                    onClick={() => handleDeleteClick(article)}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={article.title}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        {article.domain} - {new Date(article.date).toLocaleDateString()}
                      </Typography>
                      <br />
                      {article.keywords.slice(0, 5).map(k => k.keyword).join(', ')}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="h5" gutterBottom>
            Top Keywords
          </Typography>
          <List>
            {keywords.map((keyword) => (
              <ListItem key={keyword.keyword} divider>
                <ListItemText
                  primary={`${keyword.keyword} (${keyword.total_frequency})`}
                  secondary={
                    keyword.related_articles.slice(0, 3).map(article => article.title).join(', ')
                  }
                />
              </ListItem>
            ))}
          </List>
        </Grid>
      </Grid>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Article</DialogTitle>
        <DialogContent>
          Are you sure you want to delete "{articleToDelete?.title}"?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
