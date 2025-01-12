import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination,
  Grid, Card, CardContent, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { deleteArticle } from '../services/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Article {
  seq: number;
  url: string;
  title: string;
  date: string;
  domain: string;
  content: string;
  content_length: number;
  keyword_count: number;
  keywords: Array<{ keyword: string; frequency: number }>;
}

interface Stats {
  total_articles: number;
  unique_domains: number;
  total_keywords: number;
  unique_keywords: number;
  avg_keyword_frequency: number;
  top_domain: string;
  top_keyword: string;
  hourlyStats: Array<{ hour: string; count: number }>;
}

export default function Admin() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalArticles, setTotalArticles] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    fetchArticles();
    fetchStats();
  }, [page, rowsPerPage]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/articles?page=${page + 1}&limit=${rowsPerPage}`);
      const data = await response.json();
      
      if (data.success) {
        setArticles(data.data.articles);
        setTotalArticles(data.data.pagination.total);
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/stats`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteClick = (article: Article) => {
    setSelectedArticle(article);
    setDeleteDialogOpen(true);
  };

  const handleDetailsClick = async (article: Article) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/articles/${article.seq}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedArticle(data.data);
        setDetailsDialogOpen(true);
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedArticle) return;
    
    try {
      setLoading(true);
      await deleteArticle(selectedArticle.seq);
      await fetchArticles();
      await fetchStats();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: stats?.hourlyStats.map(stat => `${stat.hour}:00`) || [],
    datasets: [
      {
        label: 'Articles per Hour',
        data: stats?.hourlyStats.map(stat => stat.count) || [],
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      {error && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Articles
                </Typography>
                <Typography variant="h5">
                  {stats.total_articles}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Unique Domains
                </Typography>
                <Typography variant="h5">
                  {stats.unique_domains}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Keywords
                </Typography>
                <Typography variant="h5">
                  {stats.total_keywords}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Unique Keywords
                </Typography>
                <Typography variant="h5">
                  {stats.unique_keywords}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Hourly Article Distribution
                </Typography>
                <Line data={chartData} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Domain</TableCell>
                <TableCell align="right">Keywords</TableCell>
                <TableCell align="right">Content Length</TableCell>
                <TableCell align="right">Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                articles.map((article) => (
                  <TableRow key={article.seq}>
                    <TableCell>{article.title}</TableCell>
                    <TableCell>{article.domain}</TableCell>
                    <TableCell align="right">{article.keyword_count}</TableCell>
                    <TableCell align="right">{article.content_length}</TableCell>
                    <TableCell align="right">
                      {new Date(article.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={() => handleDetailsClick(article)}
                        size="small"
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteClick(article)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalArticles}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Article</DialogTitle>
        <DialogContent>
          Are you sure you want to delete "{selectedArticle?.title}"?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Article Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedArticle?.title}</DialogTitle>
        <DialogContent>
          {selectedArticle && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                URL: <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer">{selectedArticle.url}</a>
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                Domain: {selectedArticle.domain}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                Date: {new Date(selectedArticle.date).toLocaleString()}
              </Typography>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Keywords
              </Typography>
              <Grid container spacing={1}>
                {selectedArticle.keywords.map((keyword, index) => (
                  <Grid item key={index}>
                    <Paper sx={{ px: 1, py: 0.5 }}>
                      {keyword.keyword} ({keyword.frequency})
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Content
              </Typography>
              <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                <Typography variant="body2">
                  {selectedArticle.content}
                </Typography>
              </Paper>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
