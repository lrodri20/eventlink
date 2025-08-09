import { useEffect } from "react";
import { AppState } from "react-native";
import { auth, db } from "../firebase";
import {
    doc, setDoc, updateDoc, serverTimestamp, Timestamp,
} from "firebase/firestore";

/**
 * While mounted, keeps the attendee doc "fresh":
 * - bumps lastSeen / lastSeenMs
 * - pushes ttl into the future (so TTL won't delete us)
 */
export function usePresence(eventId: string, ttlMinutes = 5, pingMs = 45000) {
    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const ref = doc(db, `events/${eventId}/attendees/${uid}`);

        const touch = async () => {
            const now = Date.now();
            const ttl = Timestamp.fromMillis(now + ttlMinutes * 60 * 1000);
            // merge true ensures doc exists (first call acts like an upsert)
            await setDoc(
                ref,
                { lastSeen: serverTimestamp(), lastSeenMs: now, ttl },
                { merge: true }
            );
        };

        // First ping immediately
        touch();

        // Interval pings
        const id = setInterval(touch, pingMs);

        // When app returns to foreground, ping once
        const sub = AppState.addEventListener("change", (s) => {
            if (s === "active") touch();
        });

        return () => {
            clearInterval(id);
            sub.remove();
        };
    }, [eventId]);
}
