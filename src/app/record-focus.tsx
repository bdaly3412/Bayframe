"use client";

import { useEffect } from "react";

export function RecordFocus() {
  useEffect(() => {
    function focusRecord() {
      const id = window.location.hash.slice(1);
      if (!/^(booking|work|estimate|resource|task)-[a-f0-9-]{36}$/.test(id)) return true;
      const record = document.getElementById(id);
      if (!record) return false;
      record.focus();
      return true;
    }
    // Streamed records can arrive after the browser first resolves a fragment.
    const observer = new MutationObserver(() => { if (focusRecord()) observer.disconnect(); });
    function navigate() {
      observer.disconnect();
      if (!focusRecord()) observer.observe(document.getElementById("main") ?? document.body, { childList: true, subtree: true });
    }
    navigate();
    window.addEventListener("hashchange", navigate);
    return () => { observer.disconnect(); window.removeEventListener("hashchange", navigate); };
  }, []);
  return null;
}
