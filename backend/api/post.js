const express = require('express');
const router = express.Router();
const { init, startPlaying, nextTrack, previousTrack, switchDevice, getUserSession, deleteUserSession } = require('../utils/cron');

router.post('/', async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(204).end(); // No content
        return;
      }
      try{
        const session = getUserSession(accountName);
        switch(action) {
            case 'start': 
                await startPlaying(playerID, session);
                break;
            case 'switchDevice':
                await switchDevice(playerID, session);
                break;
            case 'nextTrack':
                await nextTrack(session);
                break;
            case 'previousTrack':
                await previousTrack(session);
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

router.post('/init', async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(204).end(); // No content
        return;
      }
      const { token, accountName} = req.query;
        try{
            await init(token, accountName);
            res.status(200).json({ message: "Initialization successful" });
    
        } catch (error) {
            console.error('Initialization error:', error);
            res.status(500).json({ error: error.message });
        }
    });
    
router.post('./logout', async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(204).end(); // No content
        return;
      }
       const { accountName } = req.query
      try {
        deleteUserSession(accountName);
        res.status(200).send('User session deleted');
      } catch (error) {
        console.error('Error logging out:', error);
        res.status(500).send('Error logging out');
      }
});


module.exports = router;
