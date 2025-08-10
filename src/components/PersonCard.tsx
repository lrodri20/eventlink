import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Attendee } from "../types";

function timeAgo(ts?: number) {
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
    matched,
    liked,
    onLike,
    onOpenChat,
    onPressName,
}: {
    person: Attendee;
    matched?: boolean;
    liked?: boolean;
    onLike: (p: Attendee) => void;
    onOpenChat?: (p: Attendee) => void;
    onPressName?: (p: Attendee) => void;
}) {
    const joined = timeAgo(person.joinedAt);
    const seen = timeAgo(person.lastSeenMs ?? person.joinedAt);

    return (
        <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarTxt}>
                        {person.displayName.slice(0, 1).toUpperCase()}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => onPressName?.(person)}
                    activeOpacity={0.7}
                    style={{ flex: 1 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${person.displayName}'s profile`}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                    <Text style={styles.name}>{person.displayName}</Text>
                    <Text style={styles.meta}>
                        Joined {joined} · Last seen {seen}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Bio (optional) */}
            {person.bio ? <Text style={styles.bio}>{person.bio}</Text> : null}

            {/* Action pill */}
            {matched ? (
                <TouchableOpacity
                    onPress={() => onOpenChat?.(person)}
                    style={[styles.pill, styles.pillPrimary]}
                >
                    <Text style={[styles.pillText, styles.pillTextPrimary]}>
                        Matched · Message
                    </Text>
                </TouchableOpacity>
            ) : liked ? (
                <View style={[styles.pill, styles.pillMuted]}>
                    <Text style={[styles.pillText, styles.pillTextMuted]}>Liked ✓</Text>
                </View>
            ) : (
                <TouchableOpacity
                    onPress={() => onLike(person)}
                    style={[styles.pill, styles.pillLike]}
                >
                    <Text style={[styles.pillText, styles.pillTextLike]}>Like</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        backgroundColor: "white",
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#e0e7ff",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    avatarTxt: { fontWeight: "800", color: "#3730a3" },
    name: { fontSize: 18, fontWeight: "700" },
    meta: { color: "#64748b", marginTop: 2, marginBottom: 8 },
    bio: { color: "#475569", marginBottom: 12 },

    // action pill styles
    pill: {
        alignSelf: "flex-start",
        borderRadius: 9999,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 1,
    },
    // Like (default)
    pillLike: { backgroundColor: "#ecfccb", borderColor: "#a3e635" },
    pillTextLike: { color: "#166534", fontWeight: "700" },

    // Liked (muted, non-pressable)
    pillMuted: { backgroundColor: "#f1f5f9", borderColor: "#e2e8f0" },
    pillTextMuted: { color: "#475569", fontWeight: "700" },

    // Matched → Chat
    pillPrimary: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
    pillTextPrimary: { color: "white", fontWeight: "700" },

    pillText: { fontSize: 15 },
});
