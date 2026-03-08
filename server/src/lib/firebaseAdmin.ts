import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '')
            : undefined;

        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
            console.log('Firebase Admin initialized successfully');
        } else {
            console.warn('⚠️ Firebase Admin skipped: Missing credentials. Using REST API fallback.');
        }
    } catch (error) {
        // Firebase Admin initialization failed, using REST API fallback
    }
}

export const firebaseAdmin = admin;
