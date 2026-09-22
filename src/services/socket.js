import { io } from "socket.io-client";
import { API_URL } from "./api.js";
import { tokenStore } from "./tokenStore.js";

let socket = null;

/**
 * Returns a shared, lazily-created Socket.io connection authenticated with
 * the current access token. Reused across the app so every hook/component
 * that needs real-time updates joins the same connection instead of opening
 * a new socket per component.
 */
export function getSocket() {
  if (socket) return socket;

  socket = io(API_URL, {
    autoConnect: true,
    auth: (cb) => cb({ token: tokenStore.getAccessToken() }),
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
