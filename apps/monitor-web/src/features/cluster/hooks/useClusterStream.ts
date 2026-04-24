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
  ClusterReplay,
  ClusterSnapshot,
  StreamStatus,
  WsFrame,
} from "@/features/cluster/types";

const EVENT_LOG_LIMIT = 100;
const EMPTY_REPLAY_FRAMES: WsFrame[] = [];

interface ReducerState {
  cluster: ClusterStateShape;
  eventLog: ClusterEvent[];
}

type Action =
  | { kind: "snapshot"; snapshot: ClusterSnapshot }
  | { kind: "event"; event: ClusterEvent }
  | { kind: "reset"; snapshot: ClusterSnapshot };

function reducer(state: ReducerState, action: Action): ReducerState {
  if (action.kind === "reset") {
    return {
      cluster: snapshotToState(action.snapshot),
      eventLog: [],
    };
  }
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
  streamControls: {
    paused: boolean;
    queuedFrames: number;
    togglePaused: () => void;
  };
  replay: {
    active: boolean;
    currentFrame: number;
    paused: boolean;
    totalFrames: number;
    restart: () => void;
    togglePaused: () => void;
  };
}

export function useClusterStream(
  initialSnapshot: ClusterSnapshot,
  streamUrl: string,
  replaySession?: ClusterReplay | null
): UseClusterStreamResult {
  const [state, dispatch] = useReducer(reducer, {
    cluster: snapshotToState(initialSnapshot),
    eventLog: [],
  });
  const replayFrames = replaySession?.frames ?? EMPTY_REPLAY_FRAMES;
  const replayMode = replaySession !== null && replaySession !== undefined;

  const [liveStreamStatus, setLiveStreamStatus] = useState<StreamStatus>(
    streamUrl ? "connecting" : "offline"
  );
  const [livePaused, setLivePaused] = useState(false);
  const [queuedFrames, setQueuedFrames] = useState(0);
  const [replayPaused, setReplayPaused] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const livePausedRef = useRef(false);
  const queuedFramesRef = useRef<WsFrame[]>([]);
  const replayTimerRef = useRef<number | null>(null);

  const handleFrame = useCallback((frame: WsFrame) => {
    if (frame.type === "snapshot") {
      dispatch({ kind: "snapshot", snapshot: frame });
    } else if (frame.type === "event") {
      dispatch({ kind: "event", event: frame.event });
    }
  }, []);

  const restartReplay = useCallback(() => {
    dispatch({ kind: "reset", snapshot: initialSnapshot });
    setReplayIndex(0);
    setReplayPaused(false);
  }, [initialSnapshot]);

  const toggleReplayPaused = useCallback(() => {
    setReplayPaused((current) => !current);
  }, []);

  const toggleLivePaused = useCallback(() => {
    if (livePausedRef.current) {
      livePausedRef.current = false;
      setLivePaused(false);

      const pendingFrames = queuedFramesRef.current.splice(0);
      if (pendingFrames.length === 0) {
        setQueuedFrames(0);
        return;
      }

      queueMicrotask(() => {
        pendingFrames.forEach((frame) => {
          handleFrame(frame);
        });
        setQueuedFrames(0);
      });
      return;
    }

    livePausedRef.current = true;
    setLivePaused(true);
  }, [handleFrame]);

  useEffect(() => {
    livePausedRef.current = livePaused;
  }, [livePaused]);

  useEffect(() => {
    if (!replayMode) {
      return;
    }

    if (replayTimerRef.current !== null) {
      window.clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }

    if (replayPaused) {
      return;
    }

    if (replayIndex >= replayFrames.length) {
      return;
    }

    const previousTs =
      replayIndex === 0
        ? initialSnapshot.ts
        : (replayFrames[replayIndex - 1]?.ts ?? initialSnapshot.ts);
    const nextFrame = replayFrames[replayIndex];
    const nextTs = nextFrame?.ts ?? previousTs;
    const delay = Math.min(Math.max((nextTs - previousTs) * 1000, 120), 2000);

    replayTimerRef.current = window.setTimeout(() => {
      if (nextFrame) {
        handleFrame(nextFrame);
      }
      setReplayIndex((current) => current + 1);
    }, delay);

    return () => {
      if (replayTimerRef.current !== null) {
        window.clearTimeout(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, [handleFrame, initialSnapshot.ts, replayFrames, replayIndex, replayMode, replayPaused]);

  useEffect(() => {
    if (replayMode) {
      return;
    }
    if (!streamUrl) {
      return;
    }

    const resolved = resolveClusterStreamUrl(streamUrl);
    let socket: WebSocket | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      setLiveStreamStatus(reconnectAttemptsRef.current > 0 ? "reconnecting" : "connecting");
      socket = new WebSocket(resolved);

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setLiveStreamStatus("live");
      };

      socket.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data) as WsFrame;
          if (livePausedRef.current) {
            queuedFramesRef.current.push(frame);
            setQueuedFrames(queuedFramesRef.current.length);
            return;
          }

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
        setLiveStreamStatus("reconnecting");
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      queuedFramesRef.current = [];
      setQueuedFrames(0);
      socket?.close();
      setLiveStreamStatus("offline");
    };
  }, [handleFrame, replayMode, streamUrl]);

  const streamStatus: StreamStatus = replayMode
    ? replayPaused || replayIndex >= replayFrames.length
      ? "paused"
      : "replay"
    : livePaused && liveStreamStatus !== "offline"
      ? "paused"
      : liveStreamStatus;

  return {
    cluster: state.cluster,
    eventLog: state.eventLog,
    streamStatus,
    streamControls: {
      paused: replayMode ? replayPaused || replayIndex >= replayFrames.length : livePaused,
      queuedFrames: replayMode ? 0 : queuedFrames,
      togglePaused: replayMode ? toggleReplayPaused : toggleLivePaused,
    },
    replay: {
      active: replayMode,
      currentFrame: replayIndex,
      paused: replayPaused || replayIndex >= replayFrames.length,
      totalFrames: replayFrames.length,
      restart: restartReplay,
      togglePaused: toggleReplayPaused,
    },
  };
}
