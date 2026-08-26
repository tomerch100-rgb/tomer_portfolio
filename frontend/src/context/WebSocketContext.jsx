import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { loginSuccess } from "../store/authSlice";
import { playAlertSound } from "../utils/audioAlert";
import { getWsBaseUrl } from "../services/api";

export const WebSocketContext = createContext(null);

export const ConnectionStatus = {
    CONNECTING: "CONNECTING",
    CONNECTED: "CONNECTED",
    DISCONNECTED: "DISCONNECTED",
    RECONNECTING: "RECONNECTING",
};

/**
 * Dynamically resolves the WebSocket URL based on runtime environment:
 * - Localhost / Local IP: ws://localhost:8000/ws
 * - Production: wss://tomer-portfolio-6x64.onrender.com/ws
 * Appends auth token from localStorage if present.
 */
export const buildWebSocketUrl = () => {
    const baseWsUrl = getWsBaseUrl();
    const token =
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        "";
    const tokenParam = token ? `token=${encodeURIComponent(token)}` : "";

    if (tokenParam && !baseWsUrl.includes("token=")) {
        const separator = baseWsUrl.includes("?") ? "&" : "?";
        return `${baseWsUrl}${separator}${tokenParam}`;
    }

    return baseWsUrl;
};

/**
 * WebSocketProvider
 * Global WebSocket connection manager with multi-tab awareness,
 * exponential backoff auto-reconnect, and a decoupled pub/sub event bus.
 */
export function WebSocketProvider({ children }) {
    const dispatch = useDispatch();
    const { user, isAuthenticated } = useSelector((state) => state.auth);

    const [status, setStatus] = useState(ConnectionStatus.DISCONNECTED);
    const [lastMessage, setLastMessage] = useState(null);

    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const pingIntervalRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const isExplicitDisconnectRef = useRef(false);

    // Event subscribers map: eventType -> Set of callback functions
    const subscribersRef = useRef(new Map());

    // BroadcastChannel for cross-tab event synchronization
    const broadcastChannelRef = useRef(null);

    // Initialize BroadcastChannel
    useEffect(() => {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("tomer_vest_ws_channel");
            broadcastChannelRef.current = bc;

            bc.onmessage = (event) => {
                const data = event.data;
                if (data && data.type) {
                    dispatchToSubscribers(data.type, data);
                }
            };

            return () => {
                bc.close();
            };
        }
    }, []);

    // Internal dispatcher to notify all registered listeners for a given event type
    const dispatchToSubscribers = useCallback((eventType, data) => {
        const callbacks = subscribersRef.current.get(eventType);
        if (callbacks && callbacks.size > 0) {
            callbacks.forEach((cb) => {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`Error in WebSocket subscriber for "${eventType}":`, err);
                }
            });
        }

        // Global wildcard subscribers (listening to "*")
        const wildcardCallbacks = subscribersRef.current.get("*");
        if (wildcardCallbacks && wildcardCallbacks.size > 0) {
            wildcardCallbacks.forEach((cb) => {
                try {
                    cb(data);
                } catch (err) {
                    console.error("Error in WebSocket wildcard subscriber:", err);
                }
            });
        }
    }, []);

    // Subscribe function exposed to consumers
    const subscribe = useCallback((eventType, callback) => {
        if (typeof callback !== "function") return () => {};

        if (!subscribersRef.current.has(eventType)) {
            subscribersRef.current.set(eventType, new Set());
        }

        subscribersRef.current.get(eventType).add(callback);

        // Return unsubscribe function for clean cleanup
        return () => {
            const set = subscribersRef.current.get(eventType);
            if (set) {
                set.delete(callback);
                if (set.size === 0) {
                    subscribersRef.current.delete(eventType);
                }
            }
        };
    }, []);

    // Send a message over WebSocket
    const sendMessage = useCallback((data) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const payload = typeof data === "string" ? data : JSON.stringify(data);
            wsRef.current.send(payload);
            return true;
        }
        console.warn("WebSocket is not connected. Unable to send message.");
        return false;
    }, []);

    // Connect function with dynamic URL and authentication
    const connect = useCallback(() => {
        if (!isAuthenticated || !user) {
            setStatus(ConnectionStatus.DISCONNECTED);
            return;
        }

        // Close any existing connection cleanly
        if (wsRef.current) {
            try {
                wsRef.current.onclose = null;
                wsRef.current.onerror = null;
                wsRef.current.onmessage = null;
                wsRef.current.onopen = null;
                wsRef.current.close();
            } catch (e) {
                // Ignore cleanup errors
            }
            wsRef.current = null;
        }

        isExplicitDisconnectRef.current = false;
        setStatus(
            reconnectAttemptsRef.current > 0
                ? ConnectionStatus.RECONNECTING
                : ConnectionStatus.CONNECTING
        );

        try {
            // Build dynamic WebSocket URL
            const wsUrl = buildWebSocketUrl();

            const socket = new WebSocket(wsUrl);
            wsRef.current = socket;

            socket.onopen = () => {
                console.log("🟢 WebSocket Connected Successfully");
                setStatus(ConnectionStatus.CONNECTED);
                reconnectAttemptsRef.current = 0;

                // Start periodic ping/heartbeat every 30 seconds to keep connection alive
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) {
                        try {
                            socket.send(JSON.stringify({ type: "PING" }));
                        } catch (e) {
                            // Ping failure will trigger onclose/onerror
                        }
                    }
                }, 30000);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setLastMessage(data);

                    const eventType = data.type;
                    if (eventType) {
                        // 1. Dispatch locally to all registered component listeners
                        dispatchToSubscribers(eventType, data);

                        // 2. Broadcast across open browser tabs via BroadcastChannel
                        if (broadcastChannelRef.current) {
                            broadcastChannelRef.current.postMessage(data);
                        }

                        // 3. Built-in global handlers for core platform events
                        handleCorePlatformEvents(data);
                    }
                } catch (err) {
                    console.warn("Received non-JSON WebSocket message:", event.data);
                }
            };

            socket.onerror = (error) => {
                console.warn("⚠️ WebSocket Encountered Error:", error);
            };

            socket.onclose = (event) => {
                clearInterval(pingIntervalRef.current);
                setStatus(ConnectionStatus.DISCONNECTED);

                if (!isExplicitDisconnectRef.current && isAuthenticated) {
                    scheduleReconnect();
                }
            };
        } catch (err) {
            console.error("Failed to establish WebSocket connection:", err);
            scheduleReconnect();
        }
    }, [isAuthenticated, user, dispatchToSubscribers]);

    // Handle global core platform events (Telegram link, sound alerts, etc.)
    const handleCorePlatformEvents = useCallback(
        (data) => {
            const { type, payload } = data;

            if (type === "TELEGRAM_CONNECTED" && payload) {
                // Update global Redux user state with new telegram_id
                if (user) {
                    dispatch(
                        loginSuccess({
                            ...user,
                            telegram_id: payload.telegram_id || user.telegram_id,
                        })
                    );
                }
                // Play pleasant subtle chime
                playAlertSound();
            }

            if (type === "ALERT_TRIGGERED" || type === "PORTFOLIO_ALERT_TRIGGERED") {
                // Play notification alert chime
                playAlertSound();
            }
        },

        [user, dispatch]
    );

    // Exponential backoff reconnect scheduler with random jitter
    const scheduleReconnect = useCallback(() => {
        if (isExplicitDisconnectRef.current || !isAuthenticated) return;

        reconnectAttemptsRef.current += 1;
        // Exponential backoff: base 1000ms * 1.5^attempts, capped at 15000ms + jitter
        const baseDelay = Math.min(
            15000,
            1000 * Math.pow(1.5, reconnectAttemptsRef.current - 1)
        );
        const jitter = Math.floor(Math.random() * 500);
        const delay = baseDelay + jitter;

        console.log(
            `🔄 Scheduling WebSocket reconnect attempt #${reconnectAttemptsRef.current} in ${Math.round(
                delay
            )}ms`
        );

        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
            connect();
        }, delay);
    }, [connect, isAuthenticated]);

    // Reconnect manually
    const reconnect = useCallback(() => {
        reconnectAttemptsRef.current = 0;
        connect();
    }, [connect]);

    // Manage connection lifecycle based on authentication state
    useEffect(() => {
        if (isAuthenticated && user) {
            connect();
        } else {
            isExplicitDisconnectRef.current = true;
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setStatus(ConnectionStatus.DISCONNECTED);
        }

        return () => {
            isExplicitDisconnectRef.current = true;
            clearTimeout(reconnectTimeoutRef.current);
            clearInterval(pingIntervalRef.current);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [isAuthenticated, user, connect]);

    // Handle online/offline network events
    useEffect(() => {
        const handleOnline = () => {
            console.log("🌐 Network is back online. Reconnecting WebSocket...");
            reconnectAttemptsRef.current = 0;
            connect();
        };

        const handleOffline = () => {
            console.log("🚫 Network is offline. Disconnecting WebSocket...");
            if (wsRef.current) {
                wsRef.current.close();
            }
            setStatus(ConnectionStatus.DISCONNECTED);
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [connect]);

    const contextValue = {
        status,
        isConnected: status === ConnectionStatus.CONNECTED,
        isConnecting:
            status === ConnectionStatus.CONNECTING ||
            status === ConnectionStatus.RECONNECTING,
        lastMessage,
        sendMessage,
        subscribe,
        reconnect,
    };

    return (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    );
}

/**
 * Custom hook to access WebSocket context
 */
export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error("useWebSocket must be used within a WebSocketProvider");
    }
    return context;
}

/**
 * Custom hook to subscribe to a specific WebSocket event type.
 * Automatically manages listener registration and cleanup on unmount.
 */
export function useWebSocketEvent(eventType, callback) {
    const { subscribe } = useWebSocket();
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!eventType) return;

        const unsubscribe = subscribe(eventType, (data) => {
            if (callbackRef.current) {
                callbackRef.current(data);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [eventType, subscribe]);
}

export default WebSocketProvider;
