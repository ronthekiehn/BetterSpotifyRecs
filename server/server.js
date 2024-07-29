const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const port = 3000;
var request = require('request');
var crypto = require('crypto');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

require('dotenv').config();
var client_id = process.env.CLIENT_ID; 
var client_secret = process.env.CLIENT_SECRET; 
var redirect_uri = 'https://better-spotify-recs.vercel.app/callback'; 

// Enable CORS for all routes
app.use(cors());

app.use(express.static(path.join(__dirname, 'docs')));

app.use(bodyParser.json({ limit: '1mb' })); 

const generateRandomString = (length) => {
  return crypto
    .randomBytes(60)
    .toString('hex')
    .slice(0, length);
};

var stateKey = 'spotify_auth_state';

app.use(cors({
  origin: 'https://better-spotify-recs.vercel.app'
}))
   .use(cookieParser());


app.get('/login', function(req, res) {
    var state = generateRandomString(16);
    res.cookie(stateKey, state);
    const showDialog = req.query.show_dialog === 'true';
    var scope = 'user-top-read user-library-read user-read-recently-played user-modify-playback-state user-library-modify user-read-playback-state streaming user-read-email user-read-private';
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
        show_dialog: showDialog
      }));
  });
  
app.get('/logout', (req, res) => {
    res.clearCookie('signedIn');
    res.redirect('/'); 
});

app.get('/callback', function(req, res) {
    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;
  
    if (state === null || state !== storedState) {
      res.redirect('/#' +
        querystring.stringify({
          error: 'state_mismatch'
        }));
    } else {
      res.clearCookie(stateKey);
      var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
          code: code,
          redirect_uri: redirect_uri,
          grant_type: 'authorization_code'
        },
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
        },
        json: true
      };
      res.cookie('signedIn', 'true');
      request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
  
          var access_token = body.access_token,
              refresh_token = body.refresh_token;
  
          // we can also pass the token to the browser to make requests from there
          res.redirect('/#' +
            querystring.stringify({
              access_token: access_token,
              refresh_token: refresh_token
            }));
        } else {
          res.redirect('/#' +
            querystring.stringify({
              error: 'invalid_token'
            }));
        }
      });
    }
  });

app.get('/refresh_token', function(req, res) {
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

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
  

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

