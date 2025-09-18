const functions = require("firebase-functions");
const admin = require("firebase-admin");
try { admin.app(); } catch { admin.initializeApp(); }
const db = admin.firestore();

exports.createQuoteViewNotification = functions.https.onCall(async (data, context) => {
  const { quoteId } = data || {};
  functions.logger.info("createQuoteViewNotification called", { quoteId, uid: context.auth?.uid || null });

  if (!quoteId) {
    throw new functions.https.HttpsError("invalid-argument", "quoteId is required");
  }

  const qSnap = await db.collection("quotes").doc(quoteId).get();
  if (!qSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Quote not found");
  }
  const q = qSnap.data();

  const recipientId = q.createdBy || q.userId; // supports your schema
  const clientName = q.client?.name || q.name || "Client";
  const clientEmail = q.client?.email || q.userEmail || "";

  const ts = admin.firestore.FieldValue.serverTimestamp();

  await db.collection("quoteLogs").add({
    quoteId,
    event: "OPENED",
    clientName,
    clientEmail,
    salespersonId: recipientId,
    at: ts,
  });

  await db.collection("notifications").add({
    type: "QUOTE_VIEW",
    quoteId,
    recipientId,
    clientName,
    clientEmail,
    openedAt: ts,
    isRead: false,
  });

  functions.logger.info("createQuoteViewNotification wrote docs", { quoteId, recipientId });
  return { ok: true };
});

