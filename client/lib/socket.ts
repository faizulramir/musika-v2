import { io, type Socket } from 'socket.io-client';
import { API, getToken } from './api';

let socket: Socket | null = null;

/** Get (or lazily create) the shared socket.io connection, authenticated. */
export function getSocket(): Socket {
  if (socket?.connected || socket) {
    if (socket && !socket.active) socket = null;
  }
  if (!socket) {
    socket = io(API, {
      transports: ['websocket', 'polling'],
      auth: { token: getToken() || '' },
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
