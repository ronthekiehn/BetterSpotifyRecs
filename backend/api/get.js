const express = require('express');
const router = express.Router();
const { checkStatus } = require('../cron/cron');

router.get('/status', async (req, res) => {
    try {
        const currentSong = await checkStatus();
        console.log("status", currentSong);
        res.status(200).json({ currentSong });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
