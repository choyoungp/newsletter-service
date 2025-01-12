const { runQuery, runCommand } = require('../config/database');
const crawler = require('../utils/crawler');
const keywordExtractor = require('../utils/keyword-extractor');
const logger = require('../utils/logger');

class ArticleController {
  async addArticle(req, res) {
    try {
      const { url } = req.body;

      // Check if URL already exists
      const existingArticles = await runQuery(
        'SELECT * FROM articles WHERE url = ?',
        [url]
      );

      if (existingArticles.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Article with this URL already exists'
        });
      }

      // Crawl article
      const articleData = await crawler.crawlArticle(url);

      // Insert article
      const articleResult = await runCommand(
        `INSERT INTO articles (url, title, date, content, domain)
         VALUES (?, ?, ?, ?, ?)`,
        [url, articleData.title, articleData.date, articleData.content, articleData.domain]
      );

      const articleSeq = articleResult.id;

      // Extract and insert keywords
      const keywords = await keywordExtractor.extractKeywords(
        articleData.title + ' ' + articleData.content
      );

      for (const { keyword, frequency } of keywords) {
        await runCommand(
          `INSERT INTO keywords (keyword, article_seq, frequency)
           VALUES (?, ?, ?)`,
          [keyword, articleSeq, frequency]
        );
      }

      res.status(201).json({
        success: true,
        message: 'Article added successfully',
        data: {
          article: { ...articleData, seq: articleSeq },
          keywords
        }
      });
    } catch (error) {
      logger.error('Error adding article:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add article',
        error: error.message
      });
    }
  }

  async getRecentArticles(req, res) {
    try {
      const { days = 7, limit = 10 } = req.query;
      
      const articles = await runQuery(
        `SELECT a.*, 
          json_group_array(
            json_object(
              'keyword', k.keyword,
              'frequency', k.frequency
            )
          ) as keywords
         FROM articles a
         LEFT JOIN keywords k ON k.article_seq = a.seq
         WHERE date(a.date) >= date('now', ?)
         GROUP BY a.seq
         ORDER BY a.date DESC
         LIMIT ?`,
        [`-${days} days`, limit]
      );

      // Parse keywords JSON string for each article
      const articlesWithParsedKeywords = articles.map(article => ({
        ...article,
        keywords: JSON.parse(article.keywords)
      }));

      res.json({
        success: true,
        data: articlesWithParsedKeywords
      });
    } catch (error) {
      logger.error('Error getting recent articles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get recent articles',
        error: error.message
      });
    }
  }

  async searchArticles(req, res) {
    try {
      const { keyword, startDate, endDate, limit = 10 } = req.query;

      let query = `
        SELECT DISTINCT a.*,
          json_group_array(
            json_object(
              'keyword', k.keyword,
              'frequency', k.frequency
            )
          ) as keywords
        FROM articles a
        LEFT JOIN keywords k ON k.article_seq = a.seq
        WHERE 1=1
      `;
      const params = [];

      if (keyword) {
        query += ` AND (a.title LIKE ? OR a.content LIKE ?)`;
        params.push(`%${keyword}%`, `%${keyword}%`);
      }

      if (startDate) {
        query += ` AND date(a.date) >= date(?)`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND date(a.date) <= date(?)`;
        params.push(endDate);
      }

      query += `
        GROUP BY a.seq
        ORDER BY a.date DESC
        LIMIT ?
      `;
      params.push(limit);

      const articles = await runQuery(query, params);

      // Parse keywords JSON string for each article
      const articlesWithParsedKeywords = articles.map(article => ({
        ...article,
        keywords: JSON.parse(article.keywords)
      }));

      res.json({
        success: true,
        data: articlesWithParsedKeywords
      });
    } catch (error) {
      logger.error('Error searching articles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search articles',
        error: error.message
      });
    }
  }
}

module.exports = new ArticleController();
