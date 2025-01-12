const express = require('express');
const articleController = require('../controllers/article.controller');

const router = express.Router();

// POST /api/articles - Add a new article
router.post('/', articleController.addArticle);

// GET /api/articles/recent - Get recent articles
router.get('/recent', articleController.getRecentArticles);

// GET /api/articles/search - Search articles
router.get('/search', articleController.searchArticles);

module.exports = router;
