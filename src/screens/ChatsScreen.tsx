// src/screens/ChatScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import {
    collection,
    addDoc,
    onSnapshot,
    orderBy,
    query,
    doc,
    getDoc,
    setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { ChatMessage } from "../types";

export default function ChatScreen({
    route,
}: NativeStackScreenProps<RootStackParamList, "Chat">) {
    const { eventId, matchId, peerUid, peerName } = route.params;
    const me = auth.currentUser!.uid;

    const chatRef = doc(db, `events/${eventId}/chats/${matchId}`);
    const msgsCol = collection(db, `events/${eventId}/chats/${matchId}/messages`);

    const [ready, setReady] = useState(false);
    const [msgs, setMsgs] = useState<ChatMessage[]>([]);
    const [text, setText] = useState("");
    const listRef = useRef<FlatList<ChatMessage>>(null);
    const headerHeight = useHeaderHeight();

    // Ensure the chat doc exists (rules read `uids` from it)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const s = await getDoc(chatRef);
                if (!s.exists()) {
                    await setDoc(chatRef, {
                        uids: [me, peerUid].sort(),
                        createdAt: Date.now(),
                        lastMessage: "",
                        lastMessageAt: 0,
                    });
                }
                if (!cancelled) setReady(true);
            } catch (e: any) {
                console.warn("[chat] ensure chat failed:", e?.code, e?.message);
                Alert.alert("Chat error", e?.message ?? "Could not open chat.");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [matchId, me, peerUid]);

    // Live messages once ready
    useEffect(() => {
        if (!ready) return;
        const q = query(msgsCol, orderBy("createdAt", "asc"));
        const unsub = onSnapshot(
            q,
            (snap) => {
                const list: ChatMessage[] = [];
                snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
                setMsgs(list);
                requestAnimationFrame(() =>
                    listRef.current?.scrollToEnd({ animated: true })
                );
            },
            (err) => {
                console.warn("[messages] onSnapshot error:", err.code, err.message);
                Alert.alert("Chat error", err?.message ?? "Missing permissions.");
            }
        );
        return unsub;
    }, [ready, eventId, matchId]);

    async function send() {
        const t = text.trim();
        if (!t || !ready) return;
        setText("");

        try {
            // Your rules require `from === auth.uid`
            await addDoc(msgsCol, {
                from: me,
                text: t,
                createdAt: Date.now(),
            });

            // Update chat preview
            await setDoc(
                chatRef,
                { lastMessage: t, lastMessageAt: Date.now() },
                { merge: true }
            );

            requestAnimationFrame(() =>
                listRef.current?.scrollToEnd({ animated: true })
            );
        } catch (e: any) {
            console.warn("[send] failed:", e.code, e.message);
            Alert.alert(
                "Send failed",
                e?.message ?? "Missing or insufficient permissions."
            );
        }
    }

    const renderItem = ({ item }: { item: ChatMessage }) => {
        const mine = item.from === me;
        return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.text, mine ? styles.textMine : styles.textTheirs]}>
                    {item.text}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={headerHeight}
        >
            <FlatList
                ref={listRef}
                data={msgs}
                keyExtractor={(m) => m.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
                onContentSizeChange={() =>
                    listRef.current?.scrollToEnd({ animated: true })
                }
                keyboardShouldPersistTaps="handled"
            />

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder={`Message ${peerName}`}
                    multiline
                    autoCorrect
                    autoCapitalize="sentences"
                    returnKeyType="send"
                    onSubmitEditing={send}
                    blurOnSubmit={false}
                />
                <TouchableOpacity
                    onPress={send}
                    disabled={!text.trim() || !ready}
                    style={[styles.sendBtn, (!text.trim() || !ready) && { opacity: 0.5 }]}
                >
                    <Text style={{ color: "white", fontWeight: "700" }}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    bubble: {
        maxWidth: "80%",
        borderRadius: 18,
        padding: 10,
        marginVertical: 4,
        alignSelf: "flex-start",
    },
    mine: { backgroundColor: "#2563eb", alignSelf: "flex-end" },
    theirs: { backgroundColor: "#e5e7eb" },
    text: { fontSize: 16 },
    textMine: { color: "#fff" },
    textTheirs: { color: "#111827" },
    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        padding: 8,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        gap: 8,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
    },
    sendBtn: {
        backgroundColor: "#2563eb",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
    },
});
