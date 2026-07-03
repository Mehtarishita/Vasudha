// Node.js Express endpoint for Google Translate
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const API_KEY = 'AIzaSyALYxmnFiDT1E4vq-3hz8AWTNXZuD03slo';

router.post('/translate', async (req, res) => {
  const { q, target } = req.body;
  if (!q || !target) return res.status(400).json({ error: 'Missing q or target' });
  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, target, format: 'text' })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Translation failed', details: err.message });
  }
});

module.exports = router;
