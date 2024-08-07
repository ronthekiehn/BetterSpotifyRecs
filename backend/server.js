const express = require('express');
const cors = require('cors');
const app = express();

// app.use(cors({
//   origin: 'https://better-spotify-recs.vercel.app',
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://better-spotify-recs.vercel.app");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === 'OPTIONS') {
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
        return res.status(200).json({});
    }
    next();
});


app.use(express.json());

app.use('/api/post', require('./api/post')); 
app.use('/api/get', require('./api/get'));   

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
