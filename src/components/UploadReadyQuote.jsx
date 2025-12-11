// src/components/UploadReadyQuote.jsx
import React, { useRef, useState } from "react";
import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytesResumable } from "firebase/storage";
import { auth, db, storage } from "../firebaseConfig";
import { signInAnonymously } from "firebase/auth";

const fileSafe = (s = "") => s.replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 80);

export default function UploadReadyQuote({ title = "", onDone }) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  async function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type;
    const isPdf  = type === "application/pdf";
    const isDocx = type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!isPdf && !isDocx) {
      alert("Please choose a PDF or .docx file.");
      e.target.value = "";
      return;
    }

    setBusy(true);
    try {
      // ensure auth for Storage rules
      if (!auth.currentUser) await signInAnonymously(auth).catch(() => {});
      const u = auth.currentUser;
      if (!u) throw new Error("Could not authenticate. Please try again.");

      // prefer the typed Estimate Name; fall back to file base name
      const displayName = fileSafe((title || file.name.replace(/\.(pdf|docx)$/i, "")).trim());

      // 1) create the quote
      const qRef = await addDoc(collection(db, "quotes"), {
        displayName,
        createdAt: serverTimestamp(),
        date: serverTimestamp(),
        status: "draft",
        createdBy: u.uid,
        createdByEmail: u.email || null,
        uploadedFile: {
          originalName: file.name,
          contentType: type,
          size: file.size,
          path: null,
          uploadedAt: serverTimestamp(),
        },
      });

      // 2) upload the source file (no public URL)
      const ext = isPdf ? "pdf" : "docx";
      const path = `quotes/${qRef.id}/source.${ext}`;
      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(ref(storage, path), file, { contentType: type });
        task.on("state_changed", null, reject, resolve);
      });

      // 3) persist only the storage path + metadata
      await updateDoc(doc(db, "quotes", qRef.id), {
        uploadedFile: {
          originalName: file.name,
          contentType: type,
          size: file.size,
          path,
          uploadedAt: serverTimestamp(),
        },
      });

      const origin = window.location.origin.replace(/\/$/, "");
      const shareUrl = `${origin}/view-quote?id=${qRef.id}`;
      onDone?.({ quoteId: qRef.id, shareUrl });
      alert("✅ File uploaded and quote created.");
    } catch (err) {
      console.error(err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mb-4 border rounded-xl p-4">
      <div className="text-sm font-semibold text-slate-700 mb-2">Already have a finished quote?</div>
      <div className="text-xs text-slate-500 mb-3">
        Upload a ready-made PDF or Word (.docx) file and skip the form.
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onFileChange}
        disabled={busy}
      />
    </div>
  );
}



