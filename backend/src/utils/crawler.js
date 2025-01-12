const puppeteer = require('puppeteer');
const logger = require('./logger');

class Crawler {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async crawlArticle(url) {
    try {
      await this.initialize();
      const page = await this.browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle0' });

      // Extract article information
      const article = await page.evaluate(() => {
        // Common selectors for article content
        const titleSelectors = [
          'h1',
          'article h1',
          '.article-title',
          '.entry-title',
          '[class*="title"]'
        ];

        const dateSelectors = [
          '[datetime]',
          '.date',
          '.published',
          'time',
          '[class*="date"]'
        ];

        const contentSelectors = [
          'article',
          '.article-content',
          '.entry-content',
          '[class*="content"]'
        ];

        // Helper function to find element by selectors
        const findElement = (selectors) => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element;
          }
          return null;
        };

        // Extract title
        const titleElement = findElement(titleSelectors);
        const title = titleElement ? titleElement.textContent.trim() : '';

        // Extract date
        const dateElement = findElement(dateSelectors);
        let date = dateElement ? 
          dateElement.getAttribute('datetime') || dateElement.textContent : '';
        date = date ? new Date(date).toISOString().split('T')[0] : 
          new Date().toISOString().split('T')[0];

        // Extract content
        const contentElement = findElement(contentSelectors);
        const content = contentElement ? 
          contentElement.textContent.trim().replace(/\\s+/g, ' ') : '';

        return { title, date, content };
      });

      // Extract domain
      const domain = new URL(url).hostname;

      await page.close();
      return { ...article, url, domain };
    } catch (error) {
      logger.error('Error crawling article:', error);
      throw new Error('Failed to crawl article: ' + error.message);
    }
  }
}

module.exports = new Crawler();
