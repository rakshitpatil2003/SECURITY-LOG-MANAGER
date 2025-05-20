// backend/routes/news.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const { authenticate } = require('../middleware/authMiddleware');

// Cache for storing news headlines
let newsCache = {
  timestamp: 0,
  headlines: [],
  CACHE_DURATION: 3600000 // 1 hour cache
};

const fetchNewsHeadlines = async () => {
  try {
    const response = await axios.get('https://social.cyware.com/cyber-security-news-articles');
    const $ = cheerio.load(response.data);
    
    const headlines = [];
    $('h1').each((i, el) => {
      const headline = $(el).text().trim();
      if (headline) headlines.push(headline);
    });

    return headlines;
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
};

router.get('/', authenticate, async (req, res) => {
  try {
    // Return cached data if still fresh
    if (Date.now() - newsCache.timestamp < newsCache.CACHE_DURATION) {
      return res.json(newsCache.headlines);
    }

    // Fetch fresh data
    const headlines = await fetchNewsHeadlines();
    
    // Update cache
    newsCache = {
      timestamp: Date.now(),
      headlines,
      CACHE_DURATION: 3600000
    };

    res.json(headlines);
  } catch (error) {
    console.error('News route error:', error);
    res.status(500).json({ message: 'Failed to fetch news' });
  }
});

module.exports = router;