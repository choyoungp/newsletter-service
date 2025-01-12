import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 환경 변수 설정
const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://newsletter-service-frontend.onrender.com'
];

// CORS 설정
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// 정적 파일 제공
app.use(express.static('public'));
app.use(express.json());

// 로그 디렉토리 생성
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 로깅 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error'
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log')
    })
  ]
});

// 데이터베이스 설정
const DB_PATH = process.env.NODE_ENV === 'production' 
  ? '/data/newsletter.db'
  : path.join(__dirname, '../data/newsletter.db');

// 데이터베이스 초기화
async function initializeDatabase() {
  try {
    // 데이터 디렉토리 생성
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          logger.error('Error connecting to database:', err);
          reject(err);
          return;
        }
        
        logger.info('Connected to SQLite database');
        
        // 테이블 생성
        db.serialize(() => {
          // articles 테이블
          db.run(`CREATE TABLE IF NOT EXISTS articles (
            seq INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT UNIQUE,
            title TEXT,
            content TEXT,
            domain TEXT,
            date DATETIME DEFAULT CURRENT_TIMESTAMP
          )`);

          // keywords 테이블
          db.run(`CREATE TABLE IF NOT EXISTS keywords (
            seq INTEGER PRIMARY KEY AUTOINCREMENT,
            article_seq INTEGER,
            keyword TEXT,
            frequency INTEGER,
            FOREIGN KEY (article_seq) REFERENCES articles(seq) ON DELETE CASCADE
          )`);

          resolve(db);
        });
      });
    });
  } catch (error) {
    logger.error('Database initialization error:', error);
    throw error;
  }
}

// 불용어 목록
const STOP_WORDS = new Set([
  // 조사
  '이', '가', '을', '를', '의', '에', '에서', '로', '으로', '와', '과',
  // 어미
  '습니다', '입니다', '합니다', '했습니다', '있습니다', '었습니다', '됩니다',
  '하는', '되는', '있는', '같은', '이런', '저런', '하고', '되고', '지고',
  // 대명사
  '저', '제', '내', '우리', '저희', '자신', '그', '이', '저', '그것', '이것',
  // 일반적인 동사
  '하다', '되다', '있다', '없다', '말하다', '보다', '가다', '오다', '주다',
  // 일반적인 형용사
  '좋다', '나쁘다', '크다', '작다', '많다', '적다', '어떻다', '이렇다',
  // 부사
  '매우', '너무', '아주', '잘', '더', '덜', '많이', '조금',
  // 관형사
  '이런', '저런', '그런', '어떤', '무슨',
  // 접속사
  '그리고', '하지만', '또는', '또한', '그러나', '따라서',
  // 숫자와 단위
  '하나', '둘', '셋', '첫', '두', '세', '네', '개', '명', '건', '개월', '년',
  // 직함
  '씨', '님', '대표', '사장', '부장', '과장', '대리', '사원',
  // 일반적인 명사
  '것', '등', '때', '곳', '군데', '사람', '경우', '가지', '때문', '생각',
  '내용', '정도', '부분', '관련', '이상', '이하', '기준', '방법', '문제',
  // 비즈니스 용어
  '기획자', '개발자', '디자이너', '매니저', '프로젝트', '기업', '회사',
  '서비스', '제품', '고객', '시장', '비즈니스', '전략', '목표', '계획',
  // 시간 관련
  '오늘', '내일', '모레', '어제', '그저께', '이번', '저번', '다음', '이전',
  '현재', '과거', '미래', '최근', '요즘', '앞으로', '지금',
  // 장소 관련
  '여기', '저기', '거기', '어디', '국내', '해외', '지역', '장소'
]);

// 키워드 추출 함수
function extractKeywords(text) {
  // 한글 단어 추출 (2글자 이상)
  const koreanWordRegex = /[\uAC00-\uD7AF]{2,}/g;
  const words = text.match(koreanWordRegex) || [];
  
  // 불용어 제거 및 빈도수 계산
  const keywordCount = {};
  
  words.forEach(word => {
    // 불용어가 아니고 2글자 이상인 경우만 카운트
    if (!STOP_WORDS.has(word) && word.length >= 2) {
      // 조사가 붙은 경우 처리
      let cleanWord = word;
      ['이', '가', '을', '를', '의', '에', '로'].forEach(postposition => {
        if (word.endsWith(postposition) && word.length > postposition.length) {
          cleanWord = word.slice(0, -postposition.length);
        }
      });
      
      // 2글자 이상인 경우만 추가
      if (cleanWord.length >= 2) {
        keywordCount[cleanWord] = (keywordCount[cleanWord] || 0) + 1;
      }
    }
  });

  // 영어/숫자 단어 추출 (알파벳 2자 이상)
  const englishWordRegex = /[A-Za-z]{2,}|[A-Za-z]+\d+|\d+[A-Za-z]+/g;
  const englishWords = text.match(englishWordRegex) || [];
  
  englishWords.forEach(word => {
    const lowerWord = word.toLowerCase();
    // 일반적인 영어 불용어 제외
    if (!['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'].includes(lowerWord)) {
      keywordCount[word] = (keywordCount[word] || 0) + 1;
    }
  });

  return Object.entries(keywordCount)
    .map(([keyword, frequency]) => ({ keyword, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20);  // 상위 20개 키워드만 반환
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

// Puppeteer 브라우저 설정
async function initBrowser() {
  return await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080'
    ],
    headless: 'new',
    executablePath: process.env.NODE_ENV === 'production'
      ? '/usr/bin/google-chrome'
      : puppeteer.executablePath()
  });
}

// 기사 크롤링 함수
async function crawlArticle(url) {
  const browser = await initBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // 제목과 내용 추출
    const title = await page.evaluate(() => {
      const titleElement = document.querySelector('h1, .article-title, .entry-title');
      return titleElement ? titleElement.textContent.trim() : '';
    });
    
    const content = await page.evaluate(() => {
      const contentElement = document.querySelector('article, .article-content, .entry-content');
      return contentElement ? contentElement.textContent.trim() : '';
    });
    
    return { title, content };
  } catch (error) {
    logger.error('Error crawling article:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
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

    const { title, content } = await crawlArticle(url);
    const domain = extractDomain(url);

    // 키워드 추출
    const keywords = extractKeywords(content);

    // 데이터베이스에 저장
    const db = await initializeDatabase();
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO articles (url, title, content, domain) VALUES (?, ?, ?, ?)',
        [url, title, content, domain],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this);
          }
        }
      );
    });

    const articleSeq = result.lastID;

    // 키워드 저장
    for (const { keyword, frequency } of keywords) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO keywords (article_seq, keyword, frequency) VALUES (?, ?, ?)',
          [articleSeq, keyword, frequency],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
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

// 기사 삭제 API
app.delete('/api/articles/:seq', async (req, res) => {
  const { seq } = req.params;
  
  try {
    logger.info(`Deleting article with seq: ${seq}`);

    // 먼저 연관된 키워드 삭제
    const db = await initializeDatabase();
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM keywords WHERE article_seq = ?', [seq], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    // 그 다음 기사 삭제
    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM articles WHERE seq = ?', [seq], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    logger.info(`Article deleted successfully: ${seq}`);
    
    res.json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting article:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error deleting article'
    });
  }
});

// 최근 기사 조회 API
app.get('/api/articles/recent', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const articles = await new Promise((resolve, reject) => {
      db.all(`
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
      `, function(err, rows) {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

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
    const db = await initializeDatabase();
    const keywords = await new Promise((resolve, reject) => {
      db.all(`
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
      `, function(err, rows) {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

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

// 모든 기사 조회 API (페이지네이션 포함)
app.get('/api/admin/articles', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  try {
    const db = await initializeDatabase();
    // 전체 기사 수 조회
    const countResult = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as total FROM articles', function(err, row) {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
    const total = countResult.total;

    // 기사 목록 조회
    const articles = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          a.*,
          json_group_array(
            json_object(
              'keyword', k.keyword,
              'frequency', k.frequency
            )
          ) as keywords,
          (SELECT COUNT(*) FROM keywords WHERE article_seq = a.seq) as keyword_count,
          length(content) as content_length
        FROM articles a
        LEFT JOIN keywords k ON a.seq = k.article_seq
        GROUP BY a.seq
        ORDER BY a.date DESC
        LIMIT ? OFFSET ?
      `, [limit, offset], function(err, rows) {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

    // keywords 문자열을 JSON으로 파싱
    const processedArticles = articles.map(article => ({
      ...article,
      keywords: JSON.parse(article.keywords)
    }));

    res.json({
      success: true,
      data: {
        articles: processedArticles,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching admin articles:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching admin articles'
    });
  }
});

// 기사 상세 정보 조회 API
app.get('/api/admin/articles/:seq', async (req, res) => {
  const { seq } = req.params;
  
  try {
    const db = await initializeDatabase();
    const article = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          a.*,
          json_group_array(
            json_object(
              'keyword', k.keyword,
              'frequency', k.frequency
            )
          ) as keywords
        FROM articles a
        LEFT JOIN keywords k ON a.seq = k.article_seq
        WHERE a.seq = ?
        GROUP BY a.seq
      `, [seq], function(err, row) {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // keywords 문자열을 JSON으로 파싱
    article.keywords = JSON.parse(article.keywords);

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    logger.error('Error fetching article details:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching article details'
    });
  }
});

// 크롤링 통계 조회 API
app.get('/api/admin/stats', async (req, res) => {
  try {
    const db = await initializeDatabase();
    const stats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT
          COUNT(*) as total_articles,
          COUNT(DISTINCT domain) as unique_domains,
          (SELECT COUNT(*) FROM keywords) as total_keywords,
          (SELECT COUNT(DISTINCT keyword) FROM keywords) as unique_keywords,
          (SELECT AVG(frequency) FROM keywords) as avg_keyword_frequency,
          (SELECT domain FROM articles GROUP BY domain ORDER BY COUNT(*) DESC LIMIT 1) as top_domain,
          (SELECT keyword FROM keywords GROUP BY keyword ORDER BY SUM(frequency) DESC LIMIT 1) as top_keyword
        FROM articles
      `, function(err, rows) {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

    // 시간대별 크롤링 통계
    const hourlyStats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          strftime('%H', date) as hour,
          COUNT(*) as count
        FROM articles
        GROUP BY hour
        ORDER BY hour
      `, function(err, rows) {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

    res.json({
      success: true,
      data: {
        ...stats[0],
        hourlyStats
      }
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error fetching admin stats'
    });
  }
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({
    success: false,
    message: NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// 서버 시작
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT} in ${NODE_ENV} mode`);
    });
  })
  .catch(err => {
    logger.error('Failed to start server:', err);
    process.exit(1);
  });
