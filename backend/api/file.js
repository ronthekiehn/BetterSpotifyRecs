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

  const { type, file } = req.query;

  switch(type) {
    case 'export':
      const data = req.body;
      await db.collection('exports').doc(file).set(data);
      res.send('Data received and saved successfully');
      break;
    case 'read':
      let readDoc = await db.collection('exports').doc(file).get();
      if (readDoc.exists) {
        res.json(readDoc.data());
      } else {
        res.status(404).send('File not found');
      }
      break;
    case 'exists':
      let existsDoc = await db.collection('exports').doc(file).get();
      res.json({ exists: existsDoc.exists });
      break;
  }

};
