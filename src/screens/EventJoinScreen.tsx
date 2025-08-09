import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import TextField from "../components/TextField";
import PrimaryButton from "../components/PrimaryButton";
import { collection, doc, getDocs, query, serverTimestamp, setDoc, Timestamp, where } from "firebase/firestore";
import { auth, db, ensureAnonAuth } from "../firebase";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

export default function EventJoinScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Join">) {
    const [code, setCode] = useState("");
    const [creating, setCreating] = useState(false);
    const headerHeight = useHeaderHeight();

    async function joinByCode() {
        try {
            await ensureAnonAuth();
            const c = code.trim().toUpperCase();
            if (!c) return;
            const q = query(collection(db, "events"), where("code", "==", c));
            const snap = await getDocs(q);
            if (snap.empty) { Alert.alert("Not found", "No event with that code."); return; }
            const eventRef = snap.docs[0];
            await joinEvent(eventRef.id, eventRef.get("name"));
        } catch (err: any) {
            console.error("joinByCode error:", err);
            Alert.alert("Join failed", err?.message ?? "Unknown error");
        }
    }

    async function joinEvent(eventId: string, eventName: string) {
        const uid = auth.currentUser!.uid;
        await setDoc(doc(db, `events/${eventId}/attendees/${uid}`), {
            uid,
            displayName: auth.currentUser?.displayName ?? "Anon",
            joinedAt: Date.now(),
            lastSeen: serverTimestamp(),
            lastSeenMs: Date.now(),
            ttl: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000) // match your hook
        }, { merge: true });
        navigation.replace("Event", { eventId, eventName });
    }

    async function createEvent() {
        if (creating) return; setCreating(true);
        try {
            await ensureAnonAuth();
            const c = code.trim().toUpperCase();
            if (!c) { Alert.alert("Enter a code to create"); return; }

            // ensure uniqueness by code
            const qSame = query(collection(db, "events"), where("code", "==", c));
            const snap = await getDocs(qSame);
            if (!snap.empty) { Alert.alert("Code taken", "Choose a different code."); return; }

            // 🔐 generate a Firestore-safe id without crypto.randomUUID()
            const newRef = doc(collection(db, "events"));
            const id = newRef.id;
            const name = `Event ${c}`;

            await setDoc(newRef, {
                id,
                code: c,
                name,
                createdAt: Date.now(),
                createdBy: auth.currentUser?.uid || "anon"
            });

            await joinEvent(id, name);
        } catch (err: any) {
            console.error("createEvent error:", err);
            Alert.alert("Create failed", err?.message ?? "Unknown error");
        } finally { setCreating(false); }
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={headerHeight}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>Join or create an event</Text>
                <TextField
                    label="Event code"
                    value={code}
                    onChangeText={setCode}
                    placeholder="e.g., ALPHA123"
                    autoCapitalize="characters"
                />
                <PrimaryButton title="Join Event" onPress={joinByCode} />
                <View style={{ height: 12 }} />
                <PrimaryButton
                    title={creating ? "Creating..." : "Create New Event with this Code"}
                    onPress={createEvent}
                    disabled={creating}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20, justifyContent: "center" },
    title: { fontSize: 22, fontWeight: "800", marginBottom: 12 }
});