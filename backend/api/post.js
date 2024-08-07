const express = require('express');
const router = express.Router();
const { init, startPlaying, switchDevice, nextTrack, previousTrack, likeTrack, unlikeTrack,fetchWebApi } = require('../cron/cron');

router.post('/', async (req, res) => {
    const { action, token, playerID, accountName} = req.query;

    try {
        switch (action) {
            case 'init':
                await init(token, accountName);
                break;
            case 'start':
                await startPlaying(playerID);
                break;
            case 'switchDevice':
                await switchDevice(playerID);
                break;
            case 'nextTrack':
                await nextTrack();
                break;
            case 'previousTrack':
                await previousTrack();
                break;
            case 'pauseTrack':
                await fetchWebApi(`https://api.spotify.com/v1/me/player/pause?device_id=${playerID}`, 'PUT', token);
                break;
            case 'resumeTrack':
                await fetchWebApi(`https://api.spotify.com/v1/me/player/play?device_id=${playerID}`, 'PUT', token);
                break;
            case 'likeTrack':
                await likeTrack();
                break;
            case 'unlikeTrack':
                await unlikeTrack();
                break;
            default:
                return res.status(400).json({ error: 'Unknown action' });
        }
        res.status(200).json({ message: `${action} performed successfully` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
