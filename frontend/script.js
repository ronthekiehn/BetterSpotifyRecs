const client_id = __CLIENT_ID__;
var redirect_uri = `https://better-spotify-recs.vercel.app/callback`; 
//var redirect_uri = 'http://localhost:5173/callback';

let token = '';
let refreshToken = '';
let accountName = '';

import like from './media/liked.png';
import dislike from './media/unliked.png';
import play from './media/play.png';
import pause from './media/pause.png';

let isMobile;

const apiUrl = 'https://better-spotify-recs-1931a93e5d96.herokuapp.com';

//want to keep this for frontend-centric stuff
//basically getting the users name and their devices
async function fetchWebApi(endpoint, method, body) {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method,
      
      body:JSON.stringify(body)
    });
    if (method === 'GET') {
        return await res.json();
    }
  }


async function fetchBackend(action, token=null, playerID=null) {
    const res = await fetch(`${apiUrl}/api/post?action=${action}&token=${token}&playerID=${playerID}&accountName=${accountName}`,
        {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
             }
        }
    );
    return await res.json();
}

async function initBackend(token, accountName){
    const res = await fetch(`${apiUrl}/api/post/init?token=${token}&accountName=${accountName}`,
        {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            }
        }
    );
    return await res.json();
}

async function logoutBackend(accountName){
    const res = await fetch(`${apiUrl}/api/post/logout?accountName=${accountName}`,
        {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            }
        }
    );
    return await res.json();
}


async function selectDevice(deviceId) {
        playerID = deviceId;
        await fetchBackend('switchDevice', token, playerID);
        document.getElementById("play-pause").style.backgroundImage = `url(${pause})`;
        await showDevices();
}

async function showDevices(){
    devices = (await fetchWebApi('v1/me/player/devices', 'GET')).devices;
    let deviceList;
    if (started){
        deviceList = document.getElementById("settings-device-list");
    } else{
        deviceList = document.getElementById("device-list");
    }

    deviceList.innerHTML = '';
    devices.forEach(device => {
        const button = document.createElement("button");
        if (playerID === device.id) {
            button.style.border = '2px solid #1DB954';
            button.style.fontWeight = 'bold';
        }
        button.textContent = device.name;
        button.onclick = () => selectDevice(device.id);
        deviceList.appendChild(button);
    });
}

async function init() {
    document.getElementById('landing-page').style.display = 'none';
    if (!isMobile){
        addSpotifyPlayerScript();
    }
    document.getElementById("container").style.display = "flex";
    document.getElementById("sign-out").style.display = "block";
    document.getElementById("made-with").style.display = "flex";
    

    accountName = (await fetchWebApi('v1/me', 'GET')).display_name;
    document.getElementById("hello-message").innerHTML = `Hi ${accountName}, getting things ready...`;

    if (!isMobile){
        document.getElementById("loading-text").innerHTML = "Loading Player...";
        await loadPlayer;
    }
    
    
    document.getElementById("loading-text").innerHTML = "Connecting to Server...";
    await initBackend(token, accountName);
   
    document.getElementById("loading").style.display = "none";
    document.getElementById("hello-message").style.display = "none";
    document.getElementById("device-selection").style.display = "block";
    await showDevices();

    setInterval(() => {
        refreshAccessToken(refreshToken);
    }, 59 * 60 * 1000);
}



async function getCurrent(){
    let response = await fetch(`${apiUrl}/api/get/status?accountName=${accountName}`);
    const data = await response.json();
    if (data.currentSong.id != song?.id){
        console.log("changing", data);
        song = data.currentSong;
        showTrack(song);
    }
}

function showTrack(song) {
    console.log("showing");
    let text = document.getElementById("current-song");
    text.textContent = `${song.name}`;
    text.href = song.url;
    let singer = document.getElementById("artist-details");
    singer.textContent = `${song.artist}`;
    let album = document.getElementById("album-cover-image");
    album.src = `${song.cover}`;
    if (song.liked) {
        document.getElementById("like").style.backgroundImage = `url(${like})`;
    } else{
        document.getElementById("like").style.backgroundImage = `url(${dislike})`;
    }
}

async function nextTrack() {
    await fetchBackend('nextTrack');
    document.getElementById("play-pause").style.backgroundImage = `url(${pause})`;
    getCurrent()
}


async function previousTrack() {
    await fetchBackend('previousTrack');
    document.getElementById("play-pause").style.backgroundImage = `url(${pause})`;
    getCurrent()
}


async function pauseTrack() {
    await fetchWebApi(`v1/me/player/pause?device_id=${playerID}`, 'PUT');
} 

async function resumeTrack() {
    console.log("resume");
    await fetchWebApi(`v1/me/player/play?device_id=${playerID}`, 'PUT');
}

async function likeTrack() {
    let songID = song.id;
    await fetchWebApi(`v1/me/tracks?ids=${songID}`, 'PUT');
}

async function unlikeTrack() {
    let songID = song.id;
    await fetchWebApi(`v1/me/tracks?ids=${songID}`, 'DELETE');
}

async function playButton() {
    playing = !playing;
    if (playing) {
        document.getElementById("play-pause").style.backgroundImage = `url(${pause})`;
        await resumeTrack();
    } else {
        document.getElementById("play-pause").style.backgroundImage = `url(${play})`;
        await pauseTrack();
    }
}

  //now let's see if we can figure out the SDK
window.onSpotifyWebPlaybackSDKReady = () => {
    const player = new Spotify.Player({
        name: 'Better Spotify Recs',
        getOAuthToken: cb => { cb(token); },
        volume: 1
    });

    // Ready
    player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        playerID = device_id;
        sdkReadyPromiseResolver();
    });

    // Not Ready
    player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
    });
    player.addListener('initialization_error', ({ message }) => {
        console.error(message);
    });
  
    player.addListener('authentication_error', ({ message }) => {
        console.error(message);
    });
  
    player.addListener('account_error', ({ message }) => {
        console.error(message);
    });

    player.connect();
  }

let sdkReadyPromiseResolver;
const loadPlayer = new Promise((resolve) => {
  sdkReadyPromiseResolver = resolve;
});




document.getElementById("next").onclick = async function() {
    await nextTrack();
}

document.getElementById("like").onclick = async function() {
    if (song.liked === true) {
        await unlikeTrack();
        song.liked = false;
        this.style.backgroundImage = `url(${dislike})`;
    } else {
        await likeTrack();
        song.liked = true;
        this.style.backgroundImage = `url(${like})`;
    }
};

document.getElementById("album-cover-image").addEventListener("dblclick", () =>{
    likeTrack();
    document.getElementById("like").style.backgroundImage = `url(${like})`;
});

document.getElementById("play-pause").onclick = async function(){
    await playButton();
}

document.getElementById("previous").onclick = async function() {
    await previousTrack();
};



window.addEventListener('keydown', function(event){
    if(event.key === ' '){
        playButton();
    }
});





function togglePlayer(on){
    if (on){
        document.getElementById('container').style.display = 'flex';
    } else{
        document.getElementById('container').style.display = 'none';
    }
}

document.getElementById("about-button").addEventListener('click', () => {
    const about = document.getElementById('about');
    if (about.style.display === 'block') {
        if (isMobile){
            togglePlayer(true)
        }
        about.style.display = 'none';
    } else {
        if (isMobile){
            togglePlayer(false)
            document.getElementById("settings-devices").style.display = 'none';
        }
        about.style.display = 'block';
    }
    
});

document.getElementById('settings-button').addEventListener('click', async () => {
    let deviceSet = document.getElementById("settings-devices");
   if (deviceSet.style.display === 'block') {
       if (isMobile){
           togglePlayer(true)
       }
       deviceSet.style.display = 'none';
   } else {
       if (isMobile){
           togglePlayer(false)
           document.getElementById('about').style.display = 'none';
       }
       deviceSet.style.display = 'block';
       await showDevices();
       
   }
});

document.getElementById("sign-out").onclick = signOut;

document.getElementById("settings-refresh-devices").addEventListener('click', showDevices);

document.getElementById('refresh-devices').addEventListener('click', showDevices());

document.getElementById('start-playing').addEventListener('click', async () => {
    if (playerID === undefined) {
        alert('Please select a device first');
        return;
    } else{
        await startPlaying();
    }
});

function addSpotifyPlayerScript() {
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
  }
  

let playing = true;
let playerID = undefined;
let devices = undefined;
let started = false;
let song = undefined;

async function startPlaying() {
    document.getElementById("device-selection").style.display = "none";
    document.getElementById("loading").style.display = "block";
    document.getElementById("loading-text").innerHTML = "Loading...";
    await fetchBackend('start', token, playerID);
    document.getElementById("loading").style.display = "none";
    let settings = document.getElementById("settings-div");
    let about = document.getElementById("about-div");
    
    settings.style.display = "flex";
    about.style.display = "flex";

    if (isMobile){
        settings.classList.add('mobile');
        about.classList.add('mobile');
        document.getElementById('about').classList.add('mobile');
        document.getElementById('settings-devices').classList.add('mobile');
    } else{
        settings.classList.add('desktop');
        about.classList.add('desktop');
        document.getElementById('about').classList.remove('mobile');
        document.getElementById('settings-devices').classList.remove('mobile');
    }

    document.querySelector('.player-container').classList.add('ready');
    document.getElementById("loaded-content").style.display = "block";
    await getCurrent();
    document.querySelector('.album-cover').classList.add('fade-in-album');
    document.querySelector('.song-details').classList.add('fade-in-album');
    document.querySelector('.controls').classList.add('fade-in-controls');
    
    if (isMobile){
        document.querySelector('.album-cover').classList.remove('fade-in-album');
        document.querySelector('.song-details').classList.remove('fade-in-album');
        document.querySelector('.controls').classList.remove('fade-in-controls');
    }
   

    setInterval(getCurrent, 2000);
    started = true;
  }
  


function signOut() {
    logoutBackend(accountName);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/';
}

function login(showDialog) {
    const loginUrl = `${apiUrl}/login?show_dialog=${showDialog}`;
    window.location.href = loginUrl;
  }

  function isTokenExpired() {
    
    const expirationTime = localStorage.getItem('token_expiration_time');
    console.log("checking expiry", Date.now(), expirationTime);
    return Date.now() > expirationTime;
  }

  function storeTokens(accessToken, refreshToken, expiresIn) {
    const expirationTime = Date.now() + expiresIn * 1000; // expiresIn is in seconds
  
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('token_expiration_time', expirationTime);
  }

  async function refreshAccessToken(refreshToken) {
    if (!refreshToken) return false; // If there's no refresh token, cannot refresh
  
    try {
      const response = await fetch(`${apiUrl}/refresh_token?refresh_token=${refreshToken}`);
      const data = await response.json();
  
      if (data.access_token) {
        // Update local storage with new access token and expiration time
        storeTokens(data.access_token, refreshToken, 3600); // Assuming the new token is valid for 1 hour (3600 seconds)
        token = data.access_token;
        return true;
      }
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      document.getElementById("hello-message").style.display = 'block';
      document.getElementById("hello-message").innerHTML = `Something went wrong when trying to refresh your access token. The site may stop working, if it does, please just refresh.`;
    }
    return false;
  }

async function handleAuthFlow() {
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    token = urlParams.get('access_token');
    refreshToken = urlParams.get('refresh_token');
    // If tokens are found in the URL, store them in local storage and clean up the URL
    if (token && refreshToken) {
        storeTokens(token, refreshToken, 3600)
        // Clean up the URL by redirecting to the root path without query parameters
        window.history.replaceState({}, document.title, "/");
        console.log("storing and redirecting");
        init();
        return;
    }

    // If tokens are not in the URL, check local storage
    token = localStorage.getItem('access_token');
    refreshToken = localStorage.getItem('refresh_token');
    if (!token || !refreshToken) {
        console.log("no tokens found");
        // No tokens found, redirect to the login flow
        document.getElementById('landing-page').style.display = 'flex';
        document.getElementById('login-button').onclick = () => {
            login(true);
        };
        return;
    }
    const expired = isTokenExpired();
    if (expired) {
        console.log("token expired");
        refreshAccessToken(refreshToken).then(newToken => {
          if (newToken) {
            init(); // Continue with the app flow
          } else {
            login(false); // Refresh failed, redirect to login
          }
        });
      } else {
        init(); // Access token is valid, proceed with app initialization
      }
  }

  document.addEventListener('DOMContentLoaded', function() {
    isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile){
        document.body.classList.add('mobile');
    }
    handleAuthFlow();
});