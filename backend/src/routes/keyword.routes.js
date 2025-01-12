const express = require('express');
const keywordController = require('../controllers/keyword.controller');

const router = express.Router();

// GET /api/keywords/top - Get top keywords
router.get('/top', keywordController.getTopKeywords);

// GET /api/keywords/:keyword/articles - Get articles related to a keyword
router.get('/:keyword/articles', keywordController.getRelatedArticles);

module.exports = router;
