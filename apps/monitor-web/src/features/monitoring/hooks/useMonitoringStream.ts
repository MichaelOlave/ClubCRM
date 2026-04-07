"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { getReconnectDelay } from "@/features/monitoring/lib/snapshot";
import type { MonitoringSnapshot } from "@/features/monitoring/types";

type StreamStatus = "connecting" | "live" | "reconnecting" | "offline";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export function resolveMonitoringStreamUrl(
  streamUrl: string,
  currentLocation?: string | URL,
): string {
  if (!streamUrl) {
    return streamUrl;
  }

  const locationSource =
    currentLocation ?? (typeof window !== "undefined" ? window.location.href : undefined);
  if (!locationSource) {
    return streamUrl;
  }

  let resolvedUrl: URL;
  try {
    resolvedUrl = new URL(streamUrl, locationSource);
  } catch {
    return streamUrl;
  }

  const pageUrl = new URL(locationSource);

  if (pageUrl.protocol === "https:" && resolvedUrl.protocol === "ws:") {
    resolvedUrl.protocol = "wss:";
  }

  if (LOOPBACK_HOSTS.has(resolvedUrl.hostname) && !LOOPBACK_HOSTS.has(pageUrl.hostname)) {
    resolvedUrl.hostname = pageUrl.hostname;
  }

  return resolvedUrl.toString();
}

export function useMonitoringStream(
  initialSnapshot: MonitoringSnapshot,
  streamUrl: string,
): {
  snapshot: MonitoringSnapshot;
  streamStatus: StreamStatus;
  replaceSnapshot: (nextSnapshot: MonitoringSnapshot) => void;
} {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>(
    streamUrl ? "connecting" : "offline",
  );
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);

  const replaceSnapshot = useCallback((nextSnapshot: MonitoringSnapshot) => {
    startTransition(() => {
      setSnapshot(nextSnapshot);
      setStreamStatus("live");
    });
  }, []);

  useEffect(() => {
    if (!streamUrl) {
      return;
    }

    const resolvedStreamUrl = resolveMonitoringStreamUrl(streamUrl);
    let socket: WebSocket | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) {
        return;
      }

      setStreamStatus(reconnectAttemptsRef.current > 0 ? "reconnecting" : "connecting");
      socket = new WebSocket(resolvedStreamUrl);

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setStreamStatus("live");
      };

      socket.onmessage = (event) => {
        try {
          replaceSnapshot(JSON.parse(event.data) as MonitoringSnapshot);
        } catch {
          // Ignore malformed frames so the stream can continue.
        }
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        if (cancelled) {
          return;
        }

        reconnectAttemptsRef.current += 1;
        const delay = getReconnectDelay(reconnectAttemptsRef.current);
        setStreamStatus("reconnecting");
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      socket?.close();
      setStreamStatus("offline");
    };
  }, [replaceSnapshot, streamUrl]);

  return {
    snapshot,
    streamStatus,
    replaceSnapshot,
  };
}
