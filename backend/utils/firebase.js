import admin from 'firebase-admin';
import { config } from 'dotenv';

config();

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_KEY, 'base64').toString('utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
module.exports = db;