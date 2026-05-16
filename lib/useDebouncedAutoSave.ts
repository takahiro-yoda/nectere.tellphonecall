"use client";

import { useEffect, useRef, useState } from "react";

export type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

type Options<T> = {
  payload: T;
  /** Server snapshot; baseline resets when resetKey / this changes */
  baselinePayload: T;
  resetKey: string;
  delayMs?: number;
  save: (payload: T) => Promise<{ ok: boolean; error?: string }>;
  onSuccess?: () => void;
};

export function useDebouncedAutoSave<T>({
  payload,
  baselinePayload,
  resetKey,
  delayMs = 600,
  save,
  onSuccess,
}: Options<T>) {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const baselineRef = useRef("");
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const serialized = JSON.stringify(payload);
  const baselineSerialized = JSON.stringify(baselinePayload);

  useEffect(() => {
    baselineRef.current = baselineSerialized;
    setStatus("idle");
    setError(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [resetKey, baselineSerialized]);

  useEffect(() => {
    if (serialized === baselineRef.current) return;

    setStatus((s) => (s === "error" ? "error" : "pending"));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void runSave(serialized);
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, delayMs]);

  async function runSave(snapshotSerialized: string) {
    if (snapshotSerialized === baselineRef.current) return;
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }
    inFlightRef.current = true;
    setStatus("saving");
    setError(null);
    const snapshotPayload = payloadRef.current;

    try {
      const result = await save(snapshotPayload);
      if (!result.ok) {
        setError(result.error ?? "保存に失敗しました");
        setStatus("error");
        return;
      }
      baselineRef.current = snapshotSerialized;
      setStatus("saved");
      onSuccess?.();
    } catch {
      setError("保存に失敗しました");
      setStatus("error");
    } finally {
      inFlightRef.current = false;
      const currentSerialized = JSON.stringify(payloadRef.current);
      if (queuedRef.current || currentSerialized !== baselineRef.current) {
        queuedRef.current = false;
        if (currentSerialized !== baselineRef.current) {
          setStatus((s) => (s === "error" ? "error" : "pending"));
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            void runSave(currentSerialized);
          }, delayMs);
        }
      }
    }
  }

  const isSaving = status === "pending" || status === "saving";

  return { status, error, isSaving };
}
