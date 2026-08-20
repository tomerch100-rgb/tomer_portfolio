import { useContext, useEffect, useRef } from "react";
import { WebSocketContext } from "../context/WebSocketContext";

/**
 * Hook to access the global WebSocket connection status, methods, and pub/sub system.
 */
export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error("useWebSocket must be used within a WebSocketProvider");
    }
    return context;
}

/**
 * Hook to listen to a specific WebSocket event type with automatic lifecycle management.
 *
 * @param {string} eventType - The event name to listen for (e.g. "TELEGRAM_CONNECTED", "PRICE_UPDATE", "ALERT_TRIGGERED")
 * @param {Function} callback - The handler invoked when the event is received
 */
export function useWebSocketEvent(eventType, callback) {
    const { subscribe } = useWebSocket();
    const callbackRef = useRef(callback);

    // Keep the callback reference fresh without causing unneeded re-subscriptions
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

export default useWebSocket;
