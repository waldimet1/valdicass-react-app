// api/setAdmin.js
// Admin user management endpoint

import admin from 'firebase-admin';

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Check environment variables
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    return res.status(500).json({
      error: 'Missing Firebase Admin credentials',
      missing: {
        projectId: !process.env.FIREBASE_PROJECT_ID,
        clientEmail: !process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: !process.env.FIREBASE_PRIVATE_KEY,
      }
    });
  }

  // ============================================
  // GET: Check current admins
  // ============================================
  if (req.method === 'GET') {
    try {
      const db = admin.firestore();
      const adminsSnapshot = await db.collection('admins').get();
      
      const admins = [];
      adminsSnapshot.forEach(doc => {
        admins.push({
          uid: doc.id,
          ...doc.data()
        });
      });

      return res.status(200).json({
        success: true,
        count: admins.length,
        admins: admins
      });
    } catch (error) {
      console.error('Error fetching admins:', error);
      return res.status(500).json({
        error: 'Failed to fetch admins',
        details: error.message
      });
    }
  }

  // ============================================
  // POST: Make user an admin
  // ============================================
  if (req.method === 'POST') {
    const { email, action = 'add' } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
        example: { email: 'user@example.com', action: 'add' }
      });
    }

    try {
      // Get user by email
      const user = await admin.auth().getUserByEmail(email);

      if (action === 'add') {
        // Set custom claims
        await admin.auth().setCustomUserClaims(user.uid, {
          admin: true,
        });

        // Add to Firestore admins collection
        const db = admin.firestore();
        await db.collection('admins').doc(user.uid).set({
          email: email,
          role: 'admin',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Admin access granted to: ${email} (${user.uid})`);

        return res.status(200).json({
          success: true,
          message: `${email} is now an admin`,
          uid: user.uid,
          action: 'added'
        });

      } else if (action === 'remove') {
        // Remove custom claims
        await admin.auth().setCustomUserClaims(user.uid, {
          admin: false,
        });

        // Remove from Firestore
        const db = admin.firestore();
        await db.collection('admins').doc(user.uid).delete();

        console.log(`✅ Admin access revoked from: ${email} (${user.uid})`);

        return res.status(200).json({
          success: true,
          message: `Admin access removed from ${email}`,
          uid: user.uid,
          action: 'removed'
        });
      } else {
        return res.status(400).json({
          error: 'Invalid action. Use "add" or "remove"'
        });
      }

    } catch (error) {
      console.error('setAdmin error:', error);

      if (error.code === 'auth/user-not-found') {
        return res.status(404).json({
          error: 'User not found',
          message: `No user exists with email: ${email}`,
          suggestion: 'Make sure the user has signed up first'
        });
      }

      return res.status(500).json({
        error: 'Failed to set admin',
        details: error.message,
        code: error.code
      });
    }
  }

  // Unsupported method
  return res.status(405).json({
    error: 'Method not allowed',
    allowed: ['GET', 'POST']
  });
}