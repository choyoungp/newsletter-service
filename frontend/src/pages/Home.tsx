import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  List, 
  ListItem, 
  ListItemText,
  Paper,
  CircularProgress,
  Button,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface Article {
  seq: number;
  title: string;
  url: string;
  domain: string;
  keywords: Array<{ keyword: string }>;
}

const Home = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/articles/recent`);
      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }
      const data = await response.json();
      setArticles(data);
      setError(null);
    } catch (err) {
      setError('Failed to load articles');
      console.error('Error fetching articles:', err);
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
    
    try {
      const response = await fetch(`${API_URL}/api/articles/${articleToDelete.seq}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete article');
      }
      
      await fetchArticles();
      setDeleteDialogOpen(false);
      setArticleToDelete(null);
    } catch (err) {
      setError('Failed to delete article');
      console.error('Error deleting article:', err);
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography color="error">{error}</Typography>
        <Button onClick={fetchArticles} variant="contained" sx={{ mt: 2 }}>
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" component="h1" gutterBottom>
            최근 기사
          </Typography>
          <Paper elevation={2}>
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
                    primary={
                      <Typography variant="h6">
                        <a href={article.url} target="_blank" rel="noopener noreferrer" 
                           style={{ textDecoration: 'none', color: 'inherit' }}>
                          {article.title}
                        </a>
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary">
                          도메인: {article.domain}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          키워드: {article.keywords.map(k => k.keyword).join(', ') || '없음'}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>기사 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            정말로 이 기사를 삭제하시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDeleteConfirm} color="error">삭제</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Home;
