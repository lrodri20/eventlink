import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Attendee } from "../types";

function timeAgo(ts: number | undefined) {
    if (!ts) return "—";
    const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

export default function PersonCard({
    person,
    onLike,
}: {
    person: Attendee;
    onLike: (p: Attendee) => void;
}) {
    const joined = timeAgo(person.joinedAt);
    const seen = timeAgo(person.lastSeenMs ?? person.joinedAt);

    return (
        <View style={styles.card}>
            <Text style={styles.name}>{person.displayName}</Text>
            <Text style={styles.meta}>Joined {joined} · Last seen {seen}</Text>
            {person.bio ? <Text style={styles.bio}>{person.bio}</Text> : null}
            <TouchableOpacity style={styles.likeBtn} onPress={() => onLike(person)}>
                <Text style={{ color: "white", fontWeight: "700" }}>Like</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 16, padding: 16, marginBottom: 12 },
    name: { fontSize: 18, fontWeight: "700" },
    meta: { color: "#64748b", marginTop: 4, marginBottom: 8 }, // 👈 new line
    bio: { color: "#475569", marginBottom: 12 },
    likeBtn: { backgroundColor: "#22c55e", paddingVertical: 10, borderRadius: 12, alignItems: "center" }
});
