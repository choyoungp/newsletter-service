import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface Article {
  seq: number;
  title: string;
  url: string;
  domain: string;
  keywords: Array<{ keyword: string }>;
}

const Admin = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/articles`);
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

  const handleDelete = async (articleId: number) => {
    if (window.confirm('정말로 이 기사를 삭제하시겠습니까?')) {
      try {
        const response = await fetch(`${API_URL}/api/articles/${articleId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete article');
        }

        await fetchArticles();
      } catch (err) {
        console.error('Error deleting article:', err);
      }
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const emptyRows = rowsPerPage - Math.min(rowsPerPage, articles.length - page * rowsPerPage);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        기사 관리
      </Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>제목</TableCell>
              <TableCell>도메인</TableCell>
              <TableCell>키워드</TableCell>
              <TableCell align="right">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {articles
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((article) => (
                <TableRow key={article.seq}>
                  <TableCell>
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      {article.title}
                    </a>
                  </TableCell>
                  <TableCell>{article.domain}</TableCell>
                  <TableCell>{article.keywords.map(k => k.keyword).join(', ')}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleDelete(article.seq)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
            ))}
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={4} />
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={articles.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10]}
        />
      </TableContainer>
    </Container>
  );
};

export default Admin;
