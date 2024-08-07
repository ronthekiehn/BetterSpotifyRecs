const express = require('express');
const router = express.Router();
const { init, startPlaying, switchDevice, nextTrack, previousTrack, likeTrack, unlikeTrack } = require('../cron/cron');

router.post('/', async (req, res) => {
    const { action, token, playerID, accountName} = req.query;
    console.log("received", action, token, playerID, accountName);
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
