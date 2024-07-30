const serverIP = __SERVER_IP__;
const client_id = __CLIENT_ID__;
const client_secret = __CLIENT_SECRET__;
var redirect_uri = `https://better-spotify-recs.vercel.app/callback`; 
//var redirect_uri = 'http://localhost:5173/callback';

const apiUrl = `http://${serverIP}:80`;

var stateKey = 'spotify_auth_state';
document.cookie = `${stateKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
var token = undefined;
var refresh_token = undefined;

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


async function logout() {
    document.cookie = `signedIn; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    window.location.href = '/';
}


async function fetchWebApi(endpoint, method, body) {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method,
      
      body:JSON.stringify(body)
    });
    return await res.json();
  }

async function playApi(endpoint, method, body) {
    console.log(endpoint);
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method,
      body: body

    });
    if (res.status === 403){
        return true;
    }
  }


async function getLib(){
    //gets the tracks in your liked songs, and blacklists
    let num = (await fetchWebApi(
        `v1/me/tracks?limit=1&offset=0`, 'GET'
      )).total;
    
    for (let offset = 1; offset * 50 < num + 50; offset++){
        let offset50 = offset*50;

        let allSongs = (await fetchWebApi(
            `v1/me/tracks?limit=50&offset=${offset50}`, 'GET'
          )).items;

        blacklist2(allSongs);
        await sleep(1000);
          
    }
  }

async function getTopPlayed(){
    //gets your top 100 from each time period, and blacklists
    let topAll = (await fetchWebApi(
      'v1/me/top/tracks?time_range=long_term&limit=50', 'GET'
    )).items;
    
    blacklist(topAll);
    seedlist(topAll);
    await sleep(1000);
    let top6 = (await fetchWebApi(
        'v1/me/top/tracks?time_range=medium_term&limit=50', 'GET'
      )).items;

    blacklist(top6);
    seedlist(top6);
    await sleep(1000);
    let topWeeks = (await fetchWebApi(
        'v1/me/top/tracks?time_range=short_term&limit=50', 'GET'
      )).items;
    
    blacklist(topWeeks);
    seedlist(topWeeks);

    //then get your past 50 played songs and blacklist them
    await sleep(1000);
    //seems like the spotify API literally only allows 50
    //no idea why you can't loop through
    let lastPlayed = (await fetchWebApi(
        'v1/me/player/recently-played?limit=50', 'GET'
    )).items;

    blacklist2(lastPlayed);
    
  }

async function getRecent(){
    //blacklist their most recent songs
    let lastPlayed = (await fetchWebApi(
        'v1/me/player/recently-played?limit=50', 'GET'
    )).items;

    blacklist2(lastPlayed);
    await sleep(1000);

    //and their 50 most recently liked
    let num = (await fetchWebApi(
        `v1/me/tracks?limit=1&offset=0`, 'GET'
      )).total;

    await sleep(1000); 
    num = num - 50;
      let fiftyLiked = (await fetchWebApi(
        `v1/me/tracks?limit=50&offset=${num}`, 'GET'
      )).items;

    blacklist2(fiftyLiked);

}

function seedlist(songs){
    songs.forEach(track => {
        seedSongs[track.id] = track.name
   });
}

function blacklist(songs){
    //this will add songs to our blacklist, without duplicates
    //works on track.name objects, but not track.track
    songs.forEach(track => {
         songDict[track.id] = track.name
    });
}

function blacklist2(songs){
    songs.forEach(track => {
        songDict[track.track.id] = track.track.name
   });
}


function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRecs() {
    // Get a list of ids to pull from
    let ids = Object.keys(seedSongs);
    shuffle(ids);
    let sample = ids.slice(0, 4);
    let recs = (await fetchWebApi(
        `v1/recommendations?limit=4&seed_tracks=${sample.join(',')}`, 'GET'
    )).tracks;

    let tempList = recs.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        cover: track.album.images[0].url
    }));

    // Filter out the blacklist
    tempList = tempList.filter(track => !(track.id in songDict));

    // Append the new recommendations to the end of the list
    tempList.forEach(track => {
        recList.push(track);
    });
}


async function checkFileExists(purpose) {
    const url = `${apiUrl}/file-exists/${purpose}`;
    const response = await fetch(url);
    const result = await response.json();
    return result.exists;
  }

async function readFileData(purpose) {
    const url = `${apiUrl}/read-data/${purpose}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log('File data:', data);
      return data;
    } else {
      console.error('File not found');
      return null;
    }
  }

async function sendDataToServer(data, purpose) {
    const url = `${apiUrl}/export/${purpose}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  
    if (response.ok) {
      console.log('Data sent successfully');
    } else {
      console.error('Failed to send data');
    }
  }


  async function init() {
    const blacklistExists = await checkFileExists('blacklist');
    if (blacklistExists) {
        songDict = await readFileData('blacklist');
        console.log('Data from file:', songDict);
    } else {
        console.log('Blacklist does not exist, going to load data');
        console.log('getting top songs');
        await getTopPlayed();
        console.log('getting library');
        await getLib();
        sendDataToServer(songDict, 'blacklist');
    }

    const seedlistExists = await checkFileExists('seedlist');
    if (seedlistExists) {
        seedSongs = await readFileData('seedlist');
        console.log('Data from file:', seedSongs);
    } else {
        console.log('seedList does not exist, going to load data');
        console.log('getting top songs');
        await getTopPlayed();
        sendDataToServer(seedSongs, 'seedlist');
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
}

async function nextTrack() {
    index++;
    document.getElementById("play-pause").style.backgroundImage = "url('media/pause.png')";
    await playTrack(recList[index]);
    //if low, get more recs
    if (index > recList.length - 2){
        await getRecs();
    }
}

async function playTrack(song) {
    showTrack(song);
    console.log("playing", song);
    let songID = song.id;
    await playApi(`v1/me/player/play?device_id=${playerID}`, 'PUT', JSON.stringify({ uris: [`spotify:track:${songID}`] }));
    await checkIfLiked();

    songDict[songID] = song.name;
    sendDataToServer(songDict, 'blacklist');
    
}

async function previousTrack() {
    index--;
    document.getElementById("play-pause").style.backgroundImage = "url('media/pause.png')";
    await playTrack(recList[index]);
}


async function pauseTrack() {
    console.log("pause");
    await playApi(`v1/me/player/pause?device_id=${playerID}`, 'PUT');
} 

async function resumeTrack() {
    console.log("resume");
    if (await playApi(`v1/me/player/play?device_id=${playerID}`, 'PUT')){
        console.log("403, skipping");
        await nextTrack();
    };
}

async function likeTrack() {
    let songID = recList[index].id;
    await playApi(`v1/me/tracks?ids=${songID}`, 'PUT');
}

async function unlikeTrack() {
    let songID = recList[index].id;
    console.log("unlike", recList[index].name)
    await playApi(`v1/me/tracks?ids=${songID}`, 'DELETE');
}

async function playButton() {
    playing = !playing;
    if (playing) {
        document.getElementById("play-pause").style.backgroundImage = "url('media/pause.png')";
        await resumeTrack();
    } else {
        document.getElementById("play-pause").style.backgroundImage = "url('media/play.png')";
        await pauseTrack();
    }
}


async function checkPlaybackState() {
    let stillPlaying = (await fetchWebApi(`v1/me/player?device_id=${playerID}`, 'GET'
      )).is_playing;
    if (!stillPlaying && playing) { //basically if we're paused, but we haven't clicked pause
        console.log("song ended");
        await nextTrack();
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


async function checkIfLiked() {
    let songID =recList[index].id;
    let isLiked = await fetchWebApi(`v1/me/tracks/contains?ids=${songID}`, 'GET');
    if (isLiked[0]) {
        document.getElementById("like").style.backgroundImage = "url('media/liked.png')";
        document.getElementById("like").dataset.liked = 'true';
    } else {
        document.getElementById("like").style.backgroundImage = "url('media/unliked.png')";
        document.getElementById("like").dataset.liked = 'false';
    }
}

document.getElementById("next").onclick = async function() {
    await nextTrack();
}
document.getElementById("like").onclick = async function() {
    if (this.dataset.liked === 'true') {
        await unlikeTrack();
        this.style.backgroundImage = "url('media/unliked.png')";
        this.dataset.liked = 'false';
    } else {
        await likeTrack();
        this.style.backgroundImage = "url('media/liked.png')";
        this.dataset.liked = 'true';
    }
};

document.getElementById("album-cover-image").addEventListener("dblclick", () =>{
    likeTrack();
    document.getElementById("like").style.backgroundImage = "url('media/liked.png')";
    this.dataset.liked = 'true';
});

document.getElementById("play-pause").onclick = async function(){
    await playButton();
}

document.getElementById("previous").onclick = async function() {
    await previousTrack();
};

document.getElementById("sign-out").onclick = signOut;

window.addEventListener('keydown', function(event){
    if(event.key === ' '){
        playButton();
    }
});


async function updateDevicesDropdown(devices) {
    const devicesList = document.getElementById('devices-list');
    devicesList.innerHTML = '';

    devices.forEach(device => {
        const button = document.createElement('button');
        button.innerText = device.name;

        if (device.is_active) {
            button.innerHTML += ' ✔'; 
            button.style.fontWeight = 'bold';
        }

        button.onclick = async () => {
            await pauseTrack();
            playerID = device.id;
            
            await resumeTrack();

            await playApi(`v1/me/player/repeat?state=off&device_id=${playerID}`, 'PUT');
            
            const newdevice = (await fetchWebApi('v1/me/player/devices', 'GET')).devices;
            updateDevicesDropdown(newdevice);
        };

        devicesList.appendChild(button);
    });
}

document.getElementById('settings-button').addEventListener('click', async (event) => {
    event.stopPropagation();
    const dropdown = document.getElementById('settings-dropdown');
    dropdown.style.display = "block";

    const devices = (await fetchWebApi('v1/me/player/devices', 'GET')).devices;
    updateDevicesDropdown(devices);
});

document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('settings-dropdown');
    const settingsButton = document.getElementById('settings-button');
    if (!dropdown.contains(event.target) && event.target !== settingsButton) {
        dropdown.style.display = "none";
    }
});

function removeLoginButton() {
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      loginButton.remove();
    }
  }

  function addSpotifyPlayerScript() {
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
  }
  
function signOut() {
    document.cookie = 'signedIn=false; path=/';
    window.location.href = `logout`;
}

let songDict = {};
let seedSongs = {};
let recList = [];
let playing = true;
let index = 0;
let playerID = undefined;

async function initSpotify() {
    document.getElementById('login-button').style.display = 'none';
    addSpotifyPlayerScript();
    document.getElementById("container").style.display = "flex";
    
    await loadPlayer;
    await init();
    await getRecs();
    
   
    document.getElementById("loading-text").style.display = "none";
    document.getElementById("settings").style.display = "block";
    document.querySelector('.player-container').classList.add('ready');
    document.getElementById("loaded-content").style.display = "block";
    document.querySelector('.album-cover').classList.add('fade-in-album');
    document.querySelector('.song-details').classList.add('fade-in-album');
    document.querySelector('.controls').classList.add('fade-in-controls');
    

    await playTrack(recList[index]);
    await playApi(`v1/me/player/repeat?state=off&device_id=${playerID}`, 'PUT');
    setInterval(checkPlaybackState, 5000);
  }
  
  function getCookie(name) {
    let match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}
  document.addEventListener('DOMContentLoaded', function() {
    token = localStorage.getItem('spotify_access_token');
    if (token){
        initSpotify();
    } else{
        const signedIn = getCookie('signedIn');
        if (signedIn === 'true') {
            login(false);
        } else {
            // If not signed in, show the "Login with Spotify" button
            document.getElementById('login-button').style.display = 'block';
            document.getElementById('login-button').onclick = () => {
                login(true);
            };
        }
    }
    
});