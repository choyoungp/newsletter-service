const { pool } = require('../config/database');
const logger = require('./logger');

class KeywordExtractor {
  constructor() {
    // Common words to exclude
    this.stopWords = new Set([
      '이', '그', '저', '것', '수', '등', '및', '를', '을', '에', '에서',
      '의', '가', '이다', '하다', '있다', '되다', '않다', '없다', '있는'
    ]);
  }

  async extractKeywords(text) {
    try {
      // Simple word extraction (can be improved with natural language processing libraries)
      const words = text.split(/[\s,.!?()[\]{}'"]+/)
        .filter(word => 
          word.length >= 2 && 
          !this.stopWords.has(word) &&
          !/^\d+$/.test(word) // Exclude numbers
        );

      // Count word frequencies
      const wordCount = {};
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });

      // Sort by frequency
      const sortedWords = Object.entries(wordCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Get top 10 keywords

      return sortedWords.map(([keyword, frequency]) => ({
        keyword,
        frequency
      }));
    } catch (error) {
      logger.error('Error extracting keywords:', error);
      throw error;
    }
  }

  async getRecentKeywords(days = 7) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        WITH recent_keywords AS (
          SELECT k.keyword, SUM(k.frequency) as total_frequency
          FROM keywords k
          JOIN articles a ON k.article_seq = a.seq
          WHERE a.date >= CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY k.keyword
          ORDER BY total_frequency DESC
          LIMIT 10
        )
        SELECT 
          rk.keyword,
          rk.total_frequency,
          json_agg(json_build_object(
            'title', a.title,
            'url', a.url,
            'date', a.date
          )) as related_articles
        FROM recent_keywords rk
        JOIN keywords k ON k.keyword = rk.keyword
        JOIN articles a ON k.article_seq = a.seq
        WHERE a.date >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY rk.keyword, rk.total_frequency
        ORDER BY rk.total_frequency DESC;
      `);

      return result.rows;
    } catch (error) {
      logger.error('Error getting recent keywords:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getRelatedArticles(keyword, limit = 5) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT DISTINCT a.title, a.url, a.date
        FROM articles a
        JOIN keywords k ON k.article_seq = a.seq
        WHERE k.keyword = $1
        ORDER BY a.date DESC
        LIMIT $2;
      `, [keyword, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting related articles:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new KeywordExtractor();
