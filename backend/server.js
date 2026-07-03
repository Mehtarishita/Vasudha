// Simple Express server for translation proxy
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const translateRouter = require('./translate');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api', translateRouter);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Translation proxy server running on port ${PORT}`);
});
