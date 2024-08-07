const express = require('express');
import cors from "cors"
const app = express();


app.use(cors())

app.use(express.json());

app.use('/api/post', require('./api/post')); 
app.use('/api/get', require('./api/get'));   

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
