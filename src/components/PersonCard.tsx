import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Attendee } from "../types";

export default function PersonCard({ person, onLike }: { person: Attendee; onLike: (p: Attendee) => void }) {
    return (
        <View style={styles.card}>
            <Text style={styles.name}>{person.displayName}</Text>
            {person.bio ? <Text style={styles.bio}>{person.bio}</Text> : null}
            <TouchableOpacity style={styles.likeBtn} onPress={() => onLike(person)}>
                <Text style={{ color: "white", fontWeight: "700" }}>Like</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 16, padding: 16, marginBottom: 12 },
    name: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
    bio: { color: "#475569", marginBottom: 12 },
    likeBtn: { backgroundColor: "#22c55e", paddingVertical: 10, borderRadius: 12, alignItems: "center" }
});