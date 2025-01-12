const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

const dbPath = path.resolve(__dirname, '../../newsletter.db');
const db = new sqlite3.Database(dbPath);

const setupDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create articles table
      db.run(`
        CREATE TABLE IF NOT EXISTS articles (
          seq INTEGER PRIMARY KEY AUTOINCREMENT,
          url TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          date TEXT NOT NULL,
          content TEXT NOT NULL,
          domain TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          logger.error('Error creating articles table:', err);
          reject(err);
        }
      });

      // Create keywords table
      db.run(`
        CREATE TABLE IF NOT EXISTS keywords (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          keyword TEXT NOT NULL,
          article_seq INTEGER NOT NULL,
          frequency INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (article_seq) REFERENCES articles(seq) ON DELETE CASCADE,
          UNIQUE(keyword, article_seq)
        )
      `, (err) => {
        if (err) {
          logger.error('Error creating keywords table:', err);
          reject(err);
        }
      });

      // Create indexes
      db.run('CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(date)', (err) => {
        if (err) {
          logger.error('Error creating articles date index:', err);
          reject(err);
        }
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_articles_domain ON articles(domain)', (err) => {
        if (err) {
          logger.error('Error creating articles domain index:', err);
          reject(err);
        }
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON keywords(keyword)', (err) => {
        if (err) {
          logger.error('Error creating keywords keyword index:', err);
          reject(err);
        }
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_keywords_article_seq ON keywords(article_seq)', (err) => {
        if (err) {
          logger.error('Error creating keywords article_seq index:', err);
          reject(err);
        } else {
          logger.info('Database setup completed successfully');
          resolve();
        }
      });
    });
  });
};

// Helper function to run queries with promises
const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Helper function to run insert/update queries with promises
const runCommand = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

module.exports = {
  db,
  setupDatabase,
  runQuery,
  runCommand
};
