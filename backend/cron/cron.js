const db = require('../utils/firebase');
const {fetchWebApi} = require('../utils/spotify');


let songDict = {};
let seedSongs = {};
let recList = [];
let index = 0;
let playerID = undefined;
let songLength = undefined;
let token = '';


async function init(startToken, accountName) {
    try {
        token = startToken;
        console.log(token);
        // Check and fetch blacklist
        const blacklistDoc = await db.collection('exports').doc(`${accountName}-blacklist`).get();
        if (blacklistDoc.exists) {
            songDict = blacklistDoc.data();
            await getRecent();
        } else {
            // If blacklist doesn't exist, fetch data
            await getTopPlayed();
            await getLib();
            await db.collection('exports').doc(`${accountName}-blacklist`).set(songDict);
        }

        // Check and fetch seedlist
        const seedlistDoc = await db.collection('exports').doc(`${accountName}-seedlist`).get();
        if (seedlistDoc.exists) {
            seedSongs = seedlistDoc.data();
        } else {
            // If seedlist doesn't exist, fetch data
            await getTopPlayed();
            await db.collection('exports').doc(`${accountName}-seedlist`).set(seedSongs);
        }

        res.status(200).json({ message: "Initialization successful" });
        
    } catch (error) {
        console.error('Initialization error:', error);
        res.status(500).json({ error: error.message });
    }
};

async function getLib(){
    //gets the tracks in your liked songs, and blacklists
    let num = (await fetchWebApi(
        `v1/me/tracks?limit=1&offset=0`, 'GET', token
      )).total;
    
    if (num <= 50){ //my next block doesn't work if you have less than 50
        let allSongs = (await fetchWebApi(
            `v1/me/tracks?limit=50&offset=0`, 'GET', token
          )).items;
          blacklist2(allSongs);
    } else{
        for (let offset = 0; offset * 50 < num + 50; offset++){
            let offset50 = offset*50;
    
            let allSongs = (await fetchWebApi(
                `v1/me/tracks?limit=50&offset=${offset50}`, 'GET', token
              )).items;
    
            blacklist2(allSongs);
            await sleep(1000);
              
        }
    }
  }

async function getTopPlayed(){
    //gets your top 100 from each time period, and blacklists
    let topAll = (await fetchWebApi(
      'v1/me/top/tracks?time_range=long_term&limit=50', 'GET', token
    )).items;
    
    blacklist(topAll);
    seedlist(topAll);
    await sleep(1000);
    let top6 = (await fetchWebApi(
        'v1/me/top/tracks?time_range=medium_term&limit=50', 'GET', token
      )).items;

    blacklist(top6);
    seedlist(top6);
    await sleep(1000);
    let topWeeks = (await fetchWebApi(
        'v1/me/top/tracks?time_range=short_term&limit=50', 'GET', token
      )).items;
    
    blacklist(topWeeks);
    seedlist(topWeeks);

    //then get your past 50 played songs and blacklist them
    await sleep(1000);
    let lastPlayed = (await fetchWebApi(
        'v1/me/player/recently-played?limit=50', 'GET', token
    )).items;

    blacklist2(lastPlayed);
    
  }

async function getRecent(){
    //blacklist their most recent songs
    let lastPlayed = (await fetchWebApi(
        'v1/me/player/recently-played?limit=50', 'GET', token
    )).items;

    blacklist2(lastPlayed);
    await sleep(1000);

    //and their 50 most recently liked
    let num = (await fetchWebApi(
        `v1/me/tracks?limit=1&offset=0`, 'GET', token
      )).total;

    await sleep(1000); 
    num = num - 50;
      let fiftyLiked = (await fetchWebApi(
        `v1/me/tracks?limit=50&offset=${num}`, 'GET', token
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function nextTrack() {
    index++;
    await playTrack(recList[index]);
    //if low, get more recs
    if (index > recList.length - 2){
        await getRecs();
    }
}

async function previousTrack() {
    index--;
    await playTrack(recList[index]);
}

async function likeTrack() {
    let songID = recList[index].id;
    await fetchWebApi(`v1/me/tracks?ids=${songID}`, 'PUT');
}

async function unlikeTrack() {
    let songID = recList[index].id;
    await fetchWebApi(`v1/me/tracks?ids=${songID}`, 'DELETE');
}

function switchDevice(newplayerID) {
    playerID = newplayerID;
}

async function startPlaying(){
    await getRecs();
    await playTrack(recList[index]);
    await playApi(`v1/me/player/repeat?state=off&device_id=${playerID}`, 'PUT');
}

 async function checkStatus() {
    try {
        const currentSong = recList[index];
        return currentSong;
    } catch (error) {
        console.error('Error checking status:', error);
        throw error;
    }
}

async function playTrack(song) {
    //play the song
    let songID = song.id;
    await fetchWebApi(`v1/me/player/play?device_id=${playerID}`, 'PUT', token, JSON.stringify({ uris: [`spotify:track:${songID}`] }));
    
    //check if it's liked, and add to the datastructure
    let liked = await fetchWebApi(`v1/me/tracks/contains?ids=${songID}`, 'GET', token);
    song.liked = liked;

    //add to the blacklist
    songDict[songID] = song.name;
    await db.collection('exports').doc(`${accountName}-blacklist`).set(songDict);

    //start the length checking
    songLength = (await fetchWebApi(`v1/tracks/${songID}`, 'GET', token)).duration_ms;
    checkSongEnd(songLength);
    
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
        `v1/recommendations?limit=4&seed_tracks=${sample.join(',')}`, 'GET', token
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

    if (tempList.length < 2){ //if we don't have enough new recs, get more
        await getRecs();
    }
}


async function checkSongEnd(time) {
    await sleep(time);
    console.log("checking now");
   
    let current = (await fetchWebApi(`v1/me/player?device_id=${playerID}`, 'GET')).progress_ms;
    console.log(current, songLength, time);
    if (current >= songLength -1000) { //if the song is over
        console.log("song ended");
        await nextTrack();
    } else {
        checkSongEnd(songLength - current - 1000);
    }
}


module.exports = (init, startPlaying, switchDevice, nextTrack, previousTrack, likeTrack, unlikeTrack, checkStatus, startPlaying);