const express = require('express');
const router = express.Router();
const { checkStatus, getUserSession} = require('../cron/cron');

router.get('/status', async (req, res) => {
    try {
        const session = getUserSession(accountName);
        const currentSong = await checkStatus(session);
        res.status(200).json({ currentSong });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
