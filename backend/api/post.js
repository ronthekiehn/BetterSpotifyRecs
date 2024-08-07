const express = require('express');
const router = express.Router();
const { init, startPlaying, switchDevice, nextTrack, previousTrack, likeTrack, unlikeTrack,fetchWebApi } = require('../cron/cron');

router.post('/', async (req, res) => {
    const { action, token, playerID, accountName} = req.query;
    console.log("received", action);
    try {
        switch (action) {
            case 'init':
                try{
                    await init(token, accountName);
                    res.status(200).json({ message: "Initialization successful" });
            
                } catch (error) {
                    console.error('Initialization error:', error);
                    res.status(500).json({ error: error.message });
                }
                break;
            case 'start':
                await startPlaying(playerID);
                console.log("started");
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
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

module.exports = router;
