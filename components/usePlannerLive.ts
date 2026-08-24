'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

/** Only resync after the tab was hidden. First paint / leftover focus must not wipe the store. */
export function shouldResyncPlanner(wasHidden: boolean, visibilityState: string): boolean {
  return wasHidden && visibilityState === 'visible';
}

export function usePlannerLive(onRemoteChange: () => void, userId?: string | null) {
  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    const socket = io(socketUrl, { path: '/api/socketio', transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => {
      if (userId) socket.emit('join-planner', userId);
    });
    socket.on('planner-changed', () => onRemoteChangeRef.current());

    let wasHidden = typeof document !== 'undefined' && document.hidden;
    const maybeResync = () => {
      if (document.visibilityState !== 'visible') {
        wasHidden = true;
        return;
      }
      if (!shouldResyncPlanner(wasHidden, document.visibilityState)) return;
      wasHidden = false;
      onRemoteChangeRef.current();
    };

    window.addEventListener('focus', maybeResync);
    document.addEventListener('visibilitychange', maybeResync);
    return () => {
      window.removeEventListener('focus', maybeResync);
      document.removeEventListener('visibilitychange', maybeResync);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return {
    broadcastPlannerChanged: () => {
      if (userId) socketRef.current?.emit('planner-changed', userId);
    },
  };
}
