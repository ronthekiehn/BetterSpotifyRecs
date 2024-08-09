const db = require('../utils/firebase');
const { fetchWebApi } = require('../utils/spotify');

const userSessions = {};

function createUserSession(accountName) {
  if (!userSessions[accountName]) {
    userSessions[accountName] = {
      songDict: {},
      seedSongs: {},
      recList: [],
      index: 0,
      playerID: undefined,
      songLength: undefined,
      token: '',
      started: false,
    };
  }
}

function getUserSession(accountName) {
  return userSessions[accountName];
}

function deleteUserSession(accountName) {
  delete userSessions[accountName];
}

async function init(token, accountName) {
    if (userSessions[accountName]) {
        const session = getUserSession(accountName);
        session.token = token;
        console.log("Reusing existing session for user:", userId);
        return; // Skip full init if session exists
    }
  createUserSession(accountName);

  const session = getUserSession(accountName);
  session.token = token;

  console.log(session.token);

  // Check and fetch blacklist
  const blacklistDoc = await db.collection('exports').doc(`${accountName}-blacklist`).get();
  if (blacklistDoc.exists) {
    session.songDict = blacklistDoc.data();
    await getRecent(session);
  } else {
    // If blacklist doesn't exist, fetch data
    await getTopPlayed(session);
    await getLib(session);
    await db.collection('exports').doc(`${accountName}-blacklist`).set(session.songDict);
  }

  // Check and fetch seedlist
  const seedlistDoc = await db.collection('exports').doc(`${accountName}-seedlist`).get();
  if (seedlistDoc.exists) {
    session.seedSongs = seedlistDoc.data();
  } else {
    // If seedlist doesn't exist, fetch data
    await getTopPlayed(session);
    await db.collection('exports').doc(`${accountName}-seedlist`).set(session.seedSongs);
  }
}

async function getLib(session) {
  //gets the tracks in your liked songs, and blacklists
  let num = (await fetchWebApi(`v1/me/tracks?limit=1&offset=0`, 'GET', session.token)).total;

  if (num <= 50) {
    let allSongs = (await fetchWebApi(`v1/me/tracks?limit=50&offset=0`, 'GET', session.token)).items;
    blacklist2(allSongs, session);
  } else {
    for (let offset = 0; offset * 50 < num + 50; offset++) {
      let offset50 = offset * 50;

      let allSongs = (await fetchWebApi(`v1/me/tracks?limit=50&offset=${offset50}`, 'GET', session.token)).items;

      blacklist2(allSongs, session);
      await sleep(1000);
    }
  }
}

async function getTopPlayed(session) {
  //gets your top 100 from each time period, and blacklists
  let topAll = (await fetchWebApi('v1/me/top/tracks?time_range=long_term&limit=50', 'GET', session.token)).items;

  blacklist(topAll, session);
  seedlist(topAll, session);
  await sleep(1000);
  let top6 = (await fetchWebApi('v1/me/top/tracks?time_range=medium_term&limit=50', 'GET', session.token)).items;

  blacklist(top6, session);
  seedlist(top6, session);
  await sleep(1000);
  let topWeeks = (await fetchWebApi('v1/me/top/tracks?time_range=short_term&limit=50', 'GET', session.token)).items;

  blacklist(topWeeks, session);
  seedlist(topWeeks, session);

  //then get your past 50 played songs and blacklist them
  await sleep(1000);
  let lastPlayed = (await fetchWebApi('v1/me/player/recently-played?limit=50', 'GET', session.token)).items;

  blacklist2(lastPlayed, session);
}

async function getRecent(session) {
  //blacklist their most recent songs
  let lastPlayed = (await fetchWebApi('v1/me/player/recently-played?limit=50', 'GET', session.token)).items;

  blacklist2(lastPlayed, session);
  await sleep(1000);

  //and their 50 most recently liked
  let num = (await fetchWebApi(`v1/me/tracks?limit=1&offset=0`, 'GET', session.token)).total;

  await sleep(1000);
  num = num - 50;
  let fiftyLiked = (await fetchWebApi(`v1/me/tracks?limit=50&offset=${num}`, 'GET', session.token)).items;

  blacklist2(fiftyLiked, session);
}

function seedlist(songs, session) {
  songs.forEach(track => {
    session.seedSongs[track.id] = track.name;
  });
}

function blacklist(songs, session) {
  songs.forEach(track => {
    session.songDict[track.id] = track.name;
  });
}

function blacklist2(songs, session) {
  songs.forEach(track => {
    session.songDict[track.track.id] = track.track.name;
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function nextTrack(session) {
  session.index++;
  await playTrack(session.recList[session.index], session);
  //if low, get more recs
  if (session.index > session.recList.length - 2) {
    await getRecs(session);
  }
}

async function previousTrack(session) {
  session.index--;
  await playTrack(session.recList[session.index], session);
}

async function switchDevice(newPlayerID, session) {
  session.playerID = newPlayerID;
  if (session.started){
    await nextTrack(session);
  }
}

async function startPlaying(startPlayerID, session) {
  session.playerID = startPlayerID;
  console.log("starting");
  await getRecs(session);
  await playTrack(session.recList[session.index], session);
  console.log("turning off repeat");
  await fetchWebApi(`v1/me/player/repeat?state=off&device_id=${session.playerID}`, 'PUT', session.token);
  session.started = true;
}

async function checkStatus(session) {
  try {
    const currentSong = session.recList[session.index];
    return currentSong;
  } catch (error) {
    console.error('Error checking status:', error);
    throw error;
  }
}

async function playTrack(song, session) {
  try {
    console.log("playing track", song);
    //play the song
    let songID = song.id;
    await fetchWebApi(`v1/me/player/play?device_id=${session.playerID}`, 'PUT', session.token, { uris: [`spotify:track:${songID}`] });

    console.log("checking if liked");
    //check if it's liked, and add to the data structure
    let liked = await fetchWebApi(`v1/me/tracks/contains?ids=${songID}`, 'GET', session.token);
    song.liked = liked[0];

    console.log("adding to blacklist");
    //add to the blacklist
    session.songDict[songID] = song.name;
    await db.collection('exports').doc(`${session.accountName}-blacklist`).set(session.songDict);

    console.log("getting song length");
    //start the songend checking
    session.songLength = (await fetchWebApi(`v1/tracks/${songID}`, 'GET', session.token)).duration_ms;
    checkSongEnd(session.songLength - 1500, session);
  } catch (error) {
    console.error("Error in playTrack:", error);
  }
}

async function getRecs(session) {
  console.log("getting recs");
  // Get a list of ids to pull from
  let ids = Object.keys(session.seedSongs);
  shuffle(ids);
  let sample = ids.slice(0, 4);
  let recs = (await fetchWebApi(`v1/recommendations?limit=4&seed_tracks=${sample.join(',')}`, 'GET', session.token)).tracks;

  let tempList = recs.map(track => ({
    id: track.id,
    name: track.name,
    artist: track.artists[0].name,
    cover: track.album.images[0].url
  }));

  // Filter out the blacklist
  tempList = tempList.filter(track => !(track.id in session.songDict));

  // Append the new recommendations to the end of the list
  tempList.forEach(track => {
    session.recList.push(track);
  });

  if (tempList.length < 2) { //if we don't have enough new recs, get more
    await getRecs(session);
  }
}

async function checkSongEnd(time, session) {
    if (!session) {
        console.error("Session not found for user:");
        return;
    }

    console.log(time);
    await sleep(time);
    console.log("Checking now");

    const playerStatus = await fetchWebApi('v1/me/player', 'GET', session.token);
    
    // Get current track ID and device ID
    const currentTrackId = playerStatus?.item?.id;
    const currentDeviceId = playerStatus?.device?.id;

    console.log(currentTrackId, session.recList[session.index]?.id, currentDeviceId, session.playerID);

    // If the track ID or player ID don't match the expected ones, stop the recursive checks
    if (currentTrackId !== session.recList[session.index]?.id || currentDeviceId !== session.playerID) {
        console.log("User has taken control or player has stopped. Stopping further checks.");
        session.started = false;
        return;
    }

    const currentProgress = playerStatus?.progress_ms;
    console.log(currentProgress, session.songLength, time);

    if (currentProgress >= session.songLength - 1500) { // If the song is over
        console.log("Song ended");
        await nextTrack(session);
    } else {
        checkSongEnd(session.songLength - currentProgress - 1500, session);
    }
}

function shuffle(array) {
  let currentIndex = array.length;
  let randomIndex;

  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}

module.exports = {
  init,
  nextTrack,
  previousTrack,
  startPlaying,
  switchDevice,
  checkStatus,
  getUserSession,
  deleteUserSession,
};
