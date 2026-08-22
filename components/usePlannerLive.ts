'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

export function usePlannerLive(onRemoteChange: () => void) {
  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    const socket = io(socketUrl, { path: '/api/socketio', transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-planner'));
    socket.on('planner-changed', () => onRemoteChangeRef.current());
    const resync = () => {
      if (document.visibilityState === 'visible') onRemoteChangeRef.current();
    };
    window.addEventListener('focus', resync);
    document.addEventListener('visibilitychange', resync);
    return () => {
      window.removeEventListener('focus', resync);
      document.removeEventListener('visibilitychange', resync);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return {
    broadcastPlannerChanged: () => {
      socketRef.current?.emit('planner-changed');
    },
  };
}
