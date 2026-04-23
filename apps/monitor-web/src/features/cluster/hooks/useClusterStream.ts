"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  applyEvent,
  snapshotToState,
  type ClusterStateShape,
} from "@/features/cluster/reducers/applyEvent";
import { getReconnectDelay, resolveClusterStreamUrl } from "@/features/cluster/lib/reconnect";
import type {
  ClusterEvent,
  ClusterSnapshot,
  StreamStatus,
  WsFrame,
} from "@/features/cluster/types";

const EVENT_LOG_LIMIT = 100;

interface ReducerState {
  cluster: ClusterStateShape;
  eventLog: ClusterEvent[];
}

type Action =
  | { kind: "snapshot"; snapshot: ClusterSnapshot }
  | { kind: "event"; event: ClusterEvent };

function reducer(state: ReducerState, action: Action): ReducerState {
  if (action.kind === "snapshot") {
    return {
      cluster: snapshotToState(action.snapshot),
      eventLog: state.eventLog,
    };
  }

  const nextLog = [action.event, ...state.eventLog].slice(0, EVENT_LOG_LIMIT);
  return {
    cluster: applyEvent(state.cluster, action.event),
    eventLog: nextLog,
  };
}

export interface UseClusterStreamResult {
  cluster: ClusterStateShape;
  eventLog: ClusterEvent[];
  streamStatus: StreamStatus;
}

export function useClusterStream(
  initialSnapshot: ClusterSnapshot,
  streamUrl: string
): UseClusterStreamResult {
  const [state, dispatch] = useReducer(reducer, {
    cluster: snapshotToState(initialSnapshot),
    eventLog: [],
  });

  const [streamStatus, setStreamStatus] = useState<StreamStatus>(
    streamUrl ? "connecting" : "offline"
  );
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);

  const handleFrame = useCallback((frame: WsFrame) => {
    if (frame.type === "snapshot") {
      dispatch({ kind: "snapshot", snapshot: frame });
    } else if (frame.type === "event") {
      dispatch({ kind: "event", event: frame.event });
    }
  }, []);

  useEffect(() => {
    if (!streamUrl) {
      return;
    }

    const resolved = resolveClusterStreamUrl(streamUrl);
    let socket: WebSocket | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      setStreamStatus(reconnectAttemptsRef.current > 0 ? "reconnecting" : "connecting");
      socket = new WebSocket(resolved);

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setStreamStatus("live");
      };

      socket.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data) as WsFrame;
          handleFrame(frame);
        } catch {
          // ignore malformed frames
        }
      };

      socket.onerror = () => socket?.close();

      socket.onclose = () => {
        if (cancelled) return;
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
  }, [handleFrame, streamUrl]);

  return {
    cluster: state.cluster,
    eventLog: state.eventLog,
    streamStatus,
  };
}
