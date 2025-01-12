const { runQuery } = require('../config/database');
const logger = require('../utils/logger');

class KeywordController {
  async getTopKeywords(req, res) {
    try {
      const { days = 7 } = req.query;
      
      const keywords = await runQuery(`
        WITH recent_keywords AS (
          SELECT k.keyword, SUM(k.frequency) as total_frequency
          FROM keywords k
          JOIN articles a ON k.article_seq = a.seq
          WHERE strftime('%J', a.date) >= strftime('%J', 'now', ?)
          GROUP BY k.keyword
          ORDER BY total_frequency DESC
          LIMIT 10
        )
        SELECT 
          rk.keyword,
          rk.total_frequency,
          json_group_array(
            json_object(
              'title', a.title,
              'url', a.url,
              'date', a.date
            )
          ) as related_articles
        FROM recent_keywords rk
        JOIN keywords k ON k.keyword = rk.keyword
        JOIN articles a ON k.article_seq = a.seq
        WHERE strftime('%J', a.date) >= strftime('%J', 'now', ?)
        GROUP BY rk.keyword, rk.total_frequency
        ORDER BY rk.total_frequency DESC;
      `, [`-${days} days`, `-${days} days`]);

      // Parse related_articles JSON string for each keyword
      const keywordsWithParsedArticles = keywords.map(keyword => ({
        ...keyword,
        related_articles: JSON.parse(keyword.related_articles)
      }));

      res.json({
        success: true,
        data: keywordsWithParsedArticles
      });
    } catch (error) {
      logger.error('Error getting top keywords:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get top keywords',
        error: error.message
      });
    }
  }

  async getRelatedArticles(req, res) {
    try {
      const { keyword } = req.params;
      const { limit = 5 } = req.query;

      const articles = await runQuery(`
        SELECT DISTINCT a.title, a.url, a.date
        FROM articles a
        JOIN keywords k ON k.article_seq = a.seq
        WHERE k.keyword = ?
        ORDER BY a.date DESC
        LIMIT ?
      `, [keyword, limit]);

      res.json({
        success: true,
        data: articles
      });
    } catch (error) {
      logger.error('Error getting related articles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get related articles',
        error: error.message
      });
    }
  }
}

module.exports = new KeywordController();
