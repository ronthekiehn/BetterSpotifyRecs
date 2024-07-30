// api/readData.js
import admin from 'firebase-admin';
import { join } from 'path';
import { config } from 'dotenv';

config();

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_KEY, 'base64').toString('utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export default async (req, res) => {
  const { purpose } = req.query;

  const doc = await db.collection('exports').doc(purpose).get();
  if (doc.exists) {
    res.json(doc.data());
  } else {
    res.status(404).send('File not found');
  }
};
