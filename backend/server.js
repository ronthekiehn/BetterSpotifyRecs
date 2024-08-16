const express = require('express');
const cors = require('cors');
const app = express();
const request = require('request');
const redirect_uri = 'https://better-spotify-recs-1931a93e5d96.herokuapp.com/callback';
require('dotenv').config();

app.use(cors({
  origin: 'https://better-spotify-recs.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  preflightContinue: false,
  allowedHeaders: ['Content-Type', 'Authorization']
}));


//normal routes
app.use(express.json());

app.use('/api/post', require('./api/post')); 
app.use('/api/get', require('./api/get'));   


//login stuff
function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}


var stateKey = 'spotify_auth_state';

app.get('/login', (req, res) => {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  const show_dialog = req.query.show_dialog || 'false';
  const scope = 'user-read-private user-read-email user-library-read user-read-playback-state user-modify-playback-state';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      show_dialog: show_dialog
    }));
});

app.get('/callback', (req, res) => {
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
  }

  request.post(authOptions,  (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      const refresh_token = body.refresh_token;

      // Redirect to frontend with tokens in URL parameters
      res.redirect(`https://better-spotify-recs.vercel.app/#${querystring.stringify({
        access_token: access_token,
        refresh_token: refresh_token
      })}`);
    } else {
      res.redirect(`https://better-spotify-recs.vercel.app/#${querystring.stringify({
        error: 'invalid_token'
      })}`);
    }
  });
});


app.get('/refresh_token', (req, res) => {
  const refresh_token = req.query.refresh_token;
  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64')) 
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      res.send({
        access_token: access_token,
        refresh_token: refresh_token // Send back in case it's also refreshed
      });
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
