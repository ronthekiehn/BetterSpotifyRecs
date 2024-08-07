const express = require('express');
const cors = require('cors');
const postRoutes = require('./api/post');
const getRoutes = require('./api/get');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/post', postRoutes);
app.use('/api/get', getRoutes);

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
});

module.exports = app;
