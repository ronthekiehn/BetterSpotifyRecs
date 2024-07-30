// api/exists.js
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import cors from 'cors';

const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_KEY, 'base64').toString('utf8'));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

export default async (req, res) => {
  const corsHandler = cors({ origin: true });

  corsHandler(req, res, async () => {
    const { purpose } = req.query;
    const doc = await db.collection('exports').doc(purpose).get();
    if (doc.exists) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  });
};
