"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Client-side user preferences persisted to localStorage.
 *
 * These are genuinely stored (not cosmetic no-ops): the profile fields and
 * appearance/notification toggles survive reloads. Preferences that have a
 * visible effect (reduced motion, compact density) are applied to the root
 * <html> element so CSS / framer-motion can react to them.
 */
export interface Preferences {
  fullName: string;
  email: string;
  workspaceName: string;
  reducedMotion: boolean;
  compactDensity: boolean;
  highContrastFocus: boolean;
  notifyResearchComplete: boolean;
  notifyDocumentIndexed: boolean;
  notifyReportShared: boolean;
  weeklyDigest: boolean;
  requirePassphraseExport: boolean;
  logAuditEvents: boolean;
  autoSignOut: boolean;
}

const DEFAULTS: Preferences = {
  fullName: "",
  email: "",
  workspaceName: "",
  reducedMotion: false,
  compactDensity: false,
  highContrastFocus: true,
  notifyResearchComplete: true,
  notifyDocumentIndexed: true,
  notifyReportShared: true,
  weeklyDigest: false,
  requirePassphraseExport: false,
  logAuditEvents: true,
  autoSignOut: false,
};

const KEY = "researo:preferences";

function applyToRoot(prefs: Preferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.reducedMotion = prefs.reducedMotion ? "true" : "false";
  root.dataset.density = prefs.compactDensity ? "compact" : "comfortable";
  root.dataset.focusRing = prefs.highContrastFocus ? "high" : "default";
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Preferences>) };
        setPrefs(parsed);
        applyToRoot(parsed);
      } else {
        applyToRoot(DEFAULTS);
      }
    } catch {
      // ignore malformed storage
    }
    setLoaded(true);
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // storage may be unavailable (private mode) — keep in-memory value
      }
      applyToRoot(next);
      return next;
    });
  }, []);

  return { prefs, update, loaded };
}
