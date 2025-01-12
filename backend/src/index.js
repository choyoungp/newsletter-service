const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const puppeteer = require('puppeteer');
const winston = require('winston');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// CORS 설정
app.use(cors({
  origin: ['https://newsletter-service-zbmn.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// 로깅 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// 데이터베이스 연결
let db;
const dbPath = path.join(__dirname, '../database.sqlite');

async function initializeDatabase() {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // 테이블 생성
    await db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE,
        title TEXT,
        content TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        domain TEXT
      );

      CREATE TABLE IF NOT EXISTS keywords (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        article_seq INTEGER,
        keyword TEXT,
        frequency INTEGER,
        FOREIGN KEY (article_seq) REFERENCES articles(seq)
      );
    `);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization error:', error);
    throw error;
  }
}

// 키워드 추출 함수
function extractKeywords(text) {
  // 간단한 키워드 추출 로직
  const words = text.toLowerCase().split(/\s+/);
  const keywordCount = {};
  
  words.forEach(word => {
    if (word.length > 2) {  // 3글자 이상만 카운트
      keywordCount[word] = (keywordCount[word] || 0) + 1;
    }
  });

  return Object.entries(keywordCount)
    .map(([keyword, frequency]) => ({ keyword, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);  // 상위 10개만 반환
}

// URL에서 도메인 추출
function extractDomain(url) {
  try {
    const domain = new URL(url).hostname;
    return domain;
  } catch (error) {
    logger.error('Error extracting domain:', error);
    return null;
  }
}

// 상태 확인 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 기사 추가 API
app.post('/api/articles', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ 
      success: false, 
      message: 'URL is required' 
    });
  }

  try {
    logger.info(`Processing article from URL: ${url}`);

    // Puppeteer로 웹 페이지 스크래핑
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
    } catch (error) {
      logger.error('Error loading page:', error);
      await browser.close();
      throw new Error('Failed to load the page. Please check the URL and try again.');
    }

    const title = await page.title();
    const content = await page.evaluate(() => document.body.innerText);
    const domain = extractDomain(url);

    await browser.close();

    // 키워드 추출
    const keywords = extractKeywords(content);

    // 데이터베이스에 저장
    const result = await db.run(
      'INSERT INTO articles (url, title, content, domain) VALUES (?, ?, ?, ?)',
      [url, title, content, domain]
    );

    const articleSeq = result.lastID;

    // 키워드 저장
    for (const { keyword, frequency } of keywords) {
      await db.run(
        'INSERT INTO keywords (article_seq, keyword, frequency) VALUES (?, ?, ?)',
        [articleSeq, keyword, frequency]
      );
    }

    logger.info(`Article saved successfully: ${title}`);

    res.json({
      success: true,
      data: {
        article: {
          seq: articleSeq,
          url,
          title,
          domain,
          date: new Date().toISOString(),
          keywords
        }
      }
    });
  } catch (error) {
    logger.error('Error processing article:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error processing article'
    });
  }
});

// 최근 기사 조회 API
app.get('/api/articles/recent', async (req, res) => {
  try {
    const articles = await db.all(`
      SELECT 
        a.seq, 
        a.url, 
        a.title, 
        a.date,
        a.domain,
        json_group_array(
          json_object(
            'keyword', k.keyword,
            'frequency', k.frequency
          )
        ) as keywords
      FROM articles a
      LEFT JOIN keywords k ON a.seq = k.article_seq
      GROUP BY a.seq
      ORDER BY a.date DESC
      LIMIT 10
    `);

    // keywords 문자열을 JSON으로 파싱
    const processedArticles = articles.map(article => ({
      ...article,
      keywords: JSON.parse(article.keywords)
    }));

    res.json({
      success: true,
      data: processedArticles
    });
  } catch (error) {
    logger.error('Error fetching recent articles:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching recent articles'
    });
  }
});

// 인기 키워드 조회 API
app.get('/api/keywords/top', async (req, res) => {
  try {
    const keywords = await db.all(`
      SELECT 
        k.keyword,
        SUM(k.frequency) as total_frequency,
        json_group_array(
          json_object(
            'title', a.title,
            'url', a.url,
            'date', a.date
          )
        ) as related_articles
      FROM keywords k
      JOIN articles a ON k.article_seq = a.seq
      GROUP BY k.keyword
      ORDER BY total_frequency DESC
      LIMIT 10
    `);

    // related_articles 문자열을 JSON으로 파싱
    const processedKeywords = keywords.map(keyword => ({
      ...keyword,
      related_articles: JSON.parse(keyword.related_articles)
    }));

    res.json({
      success: true,
      data: processedKeywords
    });
  } catch (error) {
    logger.error('Error fetching top keywords:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching top keywords'
    });
  }
});

// 서버 시작
initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });
  })
  .catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
