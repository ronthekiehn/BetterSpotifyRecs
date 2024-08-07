const express = require('express');
const router = express.Router();
const { init, startPlaying, switchDevice, nextTrack, previousTrack } = require('../cron/cron');

router.post('/', async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(204).end(); // No content
        return;
      }
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
