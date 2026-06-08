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
  const saveGenerationRef = useRef(0);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const serialized = JSON.stringify(payload);
  const baselineSerialized = JSON.stringify(baselinePayload);

  useEffect(() => {
    saveGenerationRef.current += 1;
    baselineRef.current = baselineSerialized;
    inFlightRef.current = false;
    queuedRef.current = false;
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
      const frozenPayload = payloadRef.current;
      const frozenSerialized = JSON.stringify(frozenPayload);
      void runSave(frozenPayload, frozenSerialized);
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, delayMs]);

  async function runSave(frozenPayload: T, frozenSerialized: string) {
    if (frozenSerialized === baselineRef.current) return;
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }
    const generation = saveGenerationRef.current;
    inFlightRef.current = true;
    setStatus("saving");
    setError(null);

    try {
      const result = await save(frozenPayload);
      if (generation !== saveGenerationRef.current) return;
      if (!result.ok) {
        setError(result.error ?? "保存に失敗しました");
        setStatus("error");
        return;
      }
      baselineRef.current = frozenSerialized;
      setStatus("saved");
      onSuccess?.();
    } catch {
      if (generation !== saveGenerationRef.current) return;
      setError("保存に失敗しました");
      setStatus("error");
    } finally {
      if (generation !== saveGenerationRef.current) {
        inFlightRef.current = false;
        return;
      }
      inFlightRef.current = false;
      const currentSerialized = JSON.stringify(payloadRef.current);
      if (queuedRef.current || currentSerialized !== baselineRef.current) {
        queuedRef.current = false;
        if (currentSerialized !== baselineRef.current) {
          setStatus((s) => (s === "error" ? "error" : "pending"));
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            const nextPayload = payloadRef.current;
            const nextSerialized = JSON.stringify(nextPayload);
            void runSave(nextPayload, nextSerialized);
          }, delayMs);
        }
      }
    }
  }

  const isSaving = status === "pending" || status === "saving";

  return { status, error, isSaving };
}
