import { useEffect, useMemo, useState } from "react";
import { db } from "@/services/firebaseConfig";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";

// Helper: timestamp → ms
function tsToMs(ts) {
  try {
    if (!ts) return null;
    if (typeof ts === "number") return ts;
    if (typeof ts?.toMillis === "function") return ts.toMillis();
    if (ts?.seconds) return ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1e6);
    return null;
  } catch {
    return null;
  }
}

// Derive high-level status
export function getQuoteStatusFromLogs(logs) {
  const hasSigned = logs.some((l) => l.event === "signed");
  const hasDeclined = logs.some((l) => l.event === "declined");
  if (hasSigned) return "signed";
  if (hasDeclined) return "declined";
  const hasOpened = logs.some((l) => l.event === "opened");
  const hasSent = logs.some((l) => l.event === "sent");
  if (hasOpened) return "viewed";
  if (hasSent) return "sent";
  return "draft";
}

/**
 * useQuoteLogs(quoteId)
 * Live subscription to Firestore `quoteLogs` for a given quoteId.
 * Returns raw logs and a computed summary.
 */
export default function useQuoteLogs(quoteId) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(Boolean(quoteId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!quoteId) {
      setLogs([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);

    const q = query(
      collection(db, "quoteLogs"),
      where("quoteId", "==", quoteId),
      orderBy("at", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLogs(rows);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [quoteId]);

  const summary = useMemo(() => {
    if (!logs.length) {
      return {
        status: "draft",
        lastEvent: null,
        lastAt: null,
        sentAt: null,
        lastSentAt: null,
        openedAt: null,
        lastOpenedAt: null,
        opensCount: 0,
        sendFailures: 0,
        lastFailureAt: null,
        isViewed: false,
        isSent: false,
        isSigned: false,
        isDeclined: false,
      };
    }

    const byEvent = logs.reduce(
      (acc, l) => {
        const when = tsToMs(l.at);
        switch (l.event) {
          case "sent":
            acc.sent.push(when);
            break;
          case "opened":
            acc.opened.push(when);
            break;
          case "send_failed":
            acc.failed.push(when);
            break;
          case "signed":
            acc.signed.push(when);
            break;
          case "declined":
            acc.declined.push(when);
            break;
          default:
            break;
        }
        return acc;
      },
      { sent: [], opened: [], failed: [], signed: [], declined: [] }
    );

    const lastLog = logs[logs.length - 1];
    const lastAt = tsToMs(lastLog?.at);
    const status = getQuoteStatusFromLogs(logs);

    const first = (arr) => (arr.length ? arr[0] : null);
    const last = (arr) => (arr.length ? arr[arr.length - 1] : null);

    return {
      status,
      lastEvent: lastLog?.event || null,
      lastAt,
      sentAt: first(byEvent.sent),
      lastSentAt: last(byEvent.sent),
      openedAt: first(byEvent.opened),
      lastOpenedAt: last(byEvent.opened),
      opensCount: byEvent.opened.length,
      sendFailures: byEvent.failed.length,
      lastFailureAt: last(byEvent.failed),
      isViewed: byEvent.opened.length > 0,
      isSent: byEvent.sent.length > 0,
      isSigned: byEvent.signed.length > 0,
      isDeclined: byEvent.declined.length > 0,
    };
  }, [logs]);

  return { logs, loading, error, summary };
}
