# Better-Spotify-Recs
Better Spotify Recommendations. Actually plays songs you haven't heard before
[better-spotify-recs.vercel.app](https://better-spotify-recs.vercel.app)
The app is in dev mode, which means Spotify limits the number of users. Send me the email connected to your Spotify, and I can approve you. Extended license and release soon.

Blacklists all of your liked and top songs, then generates recommendations based on your top songs but doesn't play anything that is on the blacklist. After you listen to a song, it goes on the blacklist so that you won't hear the same things over and over again.

Frontend is pure HTML, CSS, and Javascript with a small Vite config. Connects through the Spotify API to get songs, generate recommendations, and play songs through the player SDK and on your own devices. Hosted on Vercel. Backend is node.js and deployed on Heroku, with a Firebase server for storing data. 

## Features
- Full Spotify player that generates new recommendations
- Switch players
- Like songs

## Screenshots
<img width="570" alt="image" src="https://github.com/user-attachments/assets/0d03f8db-0773-43cb-97e2-ab7c638220e0">


