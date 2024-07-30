const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

// Enable CORS for all routes
app.use(cors());

app.use(bodyParser.json({ limit: '1mb' })); 

// Endpoint to receive exported data
app.post('/export/:purpose', (req, res) => {
  const { purpose } = req.params;
  const data = req.body;
  const filePath = path.join(__dirname, `${purpose}.json`);
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  
  res.send('Data received and saved successfully');
});

// Endpoint to check if file exists
app.get('/file-exists/:purpose', (req, res) => {
    const { purpose } = req.params;
    const filePath = path.join(__dirname, `${purpose}.json`);
    const fileExists = fs.existsSync(filePath);
    res.json({ exists: fileExists });
  });

//Endpoint to read file data
app.get('/read-data/:purpose', (req, res) => {
    const { purpose } = req.params;
    const filePath = path.join(__dirname, `${purpose}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.status(404).send('File not found');
    }
  });
  

  require('greenlock-express')
  .init({
    packageRoot: __dirname,
    configDir: './greenlock.d',

    // contact for security and critical bug notices
    maintainerEmail: 'ronthekiehn@gmail.com',

    // whether or not to run at cloudscale
    cluster: false
  })
  // Serves on 80 and 443
  // Get's SSL certificates magically!
  .ready((glx) => {
    glx.serveApp(app);
  });
