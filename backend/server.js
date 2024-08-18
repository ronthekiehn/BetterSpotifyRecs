const express = require('express');
const cors = require('cors');
const app = express();
const request = require('request');
var cookieParser = require('cookie-parser');
const { getUserSession, newToken } = require('./cron/cron');

const redirect_uri = 'https://better-spotify-recs-1931a93e5d96.herokuapp.com/callback';
require('dotenv').config();

client_id = process.env.client_id;
client_secret = process.env.client_secret;


app.use(cors({
  origin: 'https://better-spotify-recs.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  preflightContinue: false,
  allowedHeaders: ['Content-Type', 'Authorization']
})).use(cookieParser());


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
  const scope = 'user-top-read user-library-read user-read-recently-played user-modify-playback-state user-library-modify user-read-playback-state streaming user-read-email user-read-private';
  const url = new URL('https://accounts.spotify.com/authorize');
  const params = {
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
    state: state,
    show_dialog: show_dialog
  };

  for (const key in params) {
    url.searchParams.append(key, params[key]);
  }

  res.redirect(url.toString());
  
});

app.get('/callback', (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    // Handle state mismatch
    const errorParams = new URLSearchParams({ error: 'state_mismatch' });
    res.redirect(`https://better-spotify-recs.vercel.app/#${errorParams.toString()}`);
  } else {
    res.clearCookie(stateKey);
    const authOptions = {
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

    request.post(authOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const access_token = body.access_token;
        const refresh_token = body.refresh_token;

        // Redirect to frontend with tokens in URL parameters
        const tokenParams = new URLSearchParams({
          access_token: access_token,
          refresh_token: refresh_token
        });
        res.redirect(`https://better-spotify-recs.vercel.app/#${tokenParams.toString()}`);
      } else {
        // Handle token error
        const errorParams = new URLSearchParams({ error: 'invalid_token' });
        res.redirect(`https://better-spotify-recs.vercel.app/#${errorParams.toString()}`);
      }
    });
  }
});


app.get('/refresh_token', (req, res) => {
  let refresh_token = req.query.refresh_token;
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
      if (body.refresh_token) {
        refresh_token = body.refresh_token;
      }
      console.log(access_token);
      res.send({
        access_token: access_token,
        refresh_token: refresh_token // Send back in case it's also refreshed
      });
      //then we're going to update the token for the cron jobs
      const accountName = req.query.accountName;
      session = getUserSession(accountName);
      if (session){
        console.log(accountName);
        console.log(access_token);
        newToken(session, access_token);
      }
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
