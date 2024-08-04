const db = require('../utils/firebase');

export default async (req, res) => {
    // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).end(); // No content
    return;
  }

  const { purpose } = req.query;

  const doc = await db.collection('exports').doc(purpose).get();
  res.json({ exists: doc.exists });
};
