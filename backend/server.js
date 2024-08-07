const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: 'https://better-spotify-recs.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use('/api/post', require('./api/post')); 
app.use('/api/get', require('./api/get'));   

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
