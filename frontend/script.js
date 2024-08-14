const client_id = __CLIENT_ID__;
var redirect_uri = `https://better-spotify-recs.vercel.app/callback`; 
//var redirect_uri = 'http://localhost:5173/callback';

const params = new URLSearchParams(window.location.hash.substring(1));
let token = params.get('access_token');
let refreshToken = params.get('refresh_token');
let accountName = '';

import like from './media/liked.png';
import dislike from './media/unliked.png';
import play from './media/play.png';
import pause from './media/pause.png';


const apiUrl = 'https://better-spotify-recs-1931a93e5d96.herokuapp.com';

var stateKey = 'spotify_auth_state';
document.cookie = `${stateKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;

function generateRandomString(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function login(show_dialog) {
    const state = generateRandomString(16);
    document.cookie = `${stateKey}=${state}; path=/`;
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

    window.location.href = url.toString();
};


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
        console.log("selecting device", deviceId);
        playerID = deviceId;
        await fetchBackend('switchDevice', token, playerID);
        await showDevices();
}

async function showDevices(){
    console.log("showing devices");
    devices = (await fetchWebApi('v1/me/player/devices', 'GET')).devices;
    console.log(devices);
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
    addSpotifyPlayerScript();
    document.getElementById("container").style.display = "flex";
    

    accountName = (await fetchWebApi('v1/me', 'GET')).display_name;
    document.getElementById("hello-message").innerHTML = `Hi ${accountName}, getting things ready...`;

    document.getElementById("loading-text").innerHTML = "Loading Player...";
    await loadPlayer;
    
    document.getElementById("loading-text").innerHTML = "Connecting to Server...";
    console.log(await initBackend(token, accountName));
   
    document.getElementById("loading").style.display = "none";
    document.getElementById("hello-message").style.display = "none";
    document.getElementById("device-selection").style.display = "block";
    await showDevices();
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
    let singer = document.getElementById("artist-details");
    singer.textContent = `${song.artist}`;
    let album = document.getElementById("album-cover-image");
    album.src = `${song.cover}`;
    if (song.liked) {
        document.getElementById("like").style.backgroundImage = `url(${like})`;
    }
}

async function nextTrack() {
    await fetchBackend('nextTrack');
    getCurrent()
}


async function previousTrack() {
    await fetchBackend('previousTrack');
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



document.getElementById('settings-button').addEventListener('click', async () => {
     let deviceSet = document.getElementById("settings-devices");
    if (deviceSet.style.display === 'block') {
        deviceSet.style.display = 'none';
    } else {
        deviceSet.style.display = 'block';
        await showDevices();
    }
});

document.getElementById("about-button").addEventListener('click', () => {
    const about = document.getElementById('about');
    if (about.style.display === 'block') {
        about.style.display = 'none';
    } else {
        about.style.display = 'block';
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
  
function signOut() {
    logoutBackend(accountName);
    document.cookie = 'signedIn=false; path=/';
    window.location.href = '/';
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
    document.getElementById("settings-div").style.display = "flex";
    document.getElementById("about-div").style.display = "flex";
    document.querySelector('.player-container').classList.add('ready');
    document.getElementById("loaded-content").style.display = "block";
    await getCurrent();
    document.querySelector('.album-cover').classList.add('fade-in-album');
    document.querySelector('.song-details').classList.add('fade-in-album');
    document.querySelector('.controls').classList.add('fade-in-controls');
    
    setInterval(getCurrent, 2000);
    started = true;
  }
  

function getCookie(name) {
    let match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}
  document.addEventListener('DOMContentLoaded', function() {
    if (token){
        init();
    } else{
        const signedIn = getCookie('signedIn');
        console.log(signedIn);
        if (signedIn === 'true') {
            login(false);
        } else {
            // If not signed in, show the "Login with Spotify" button
            document.getElementById('landing-page').style.display = 'flex';
            document.getElementById('login-button').onclick = () => {
                login(true);
            };
        }
    }
    
});