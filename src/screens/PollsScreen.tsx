import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import TextField from "../components/TextField";
import PrimaryButton from "../components/PrimaryButton";
import { auth, db } from "../firebase";
import { Poll } from "../types";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { EventTabParamList } from "./EventTabs";

function uid() {
    return Math.random().toString(36).slice(2, 9);
}

export default function PollsScreen({
    route,
}: BottomTabScreenProps<EventTabParamList, "Polls">) {
    const { eventId } = route.params;
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState<string[]>(["", ""]); // dynamic up to maxOptions
    const [polls, setPolls] = useState<Poll[]>([]);
    const maxOptions = 10; // align with your Firestore rules
    const headerHeight = useHeaderHeight();

    useEffect(() => {
        const q = collection(db, `events/${eventId}/polls`);
        const unsub = onSnapshot(q, (snap) => {
            const list: Poll[] = [];
            snap.forEach((d) => list.push(d.data() as Poll));
            list.sort((a, b) => b.createdAt - a.createdAt);
            setPolls(list);
        });
        return unsub;
    }, [eventId]);

    function setOptionText(index: number, text: string) {
        setOptions((prev) => prev.map((v, i) => (i === index ? text : v)));
    }

    function addOption() {
        setOptions((prev) => (prev.length < maxOptions ? [...prev, ""] : prev));
    }

    function removeOption(index: number) {
        // Keep at least 2 options
        setOptions((prev) =>
            prev.length > 2 ? prev.filter((_, i) => i !== index) : prev
        );
    }

    async function createPoll() {
        const trimmed = options.map((o) => o.trim());
        const filled = trimmed.filter(Boolean);
        if (!question.trim() || filled.length < 2) return;

        // create doc ref to avoid crypto.randomUUID on RN
        const newRef = doc(collection(db, `events/${eventId}/polls`));
        const poll: Poll = {
            id: newRef.id,
            question: question.trim(),
            options: filled.slice(0, maxOptions).map((text) => ({ id: uid(), text })),
            createdBy: auth.currentUser!.uid,
            createdAt: Date.now(),
        };
        await setDoc(newRef, poll);
        setQuestion("");
        setOptions(["", ""]);
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={headerHeight}
        >
            <ScrollView
                contentContainerStyle={{ padding: 16 }}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8 }}>
                    Create a poll
                </Text>
                <TextField
                    label="Question"
                    value={question}
                    onChangeText={setQuestion}
                    placeholder="What did you like most?"
                />

                {options.map((opt, i) => (
                    <View key={i} style={{ marginBottom: 8 }}>
                        <TextField
                            label={`Option ${String.fromCharCode(65 + i)}`}
                            value={opt}
                            onChangeText={(t) => setOptionText(i, t)}
                            placeholder={
                                i === 0 ? "e.g., Music" : i === 1 ? "e.g., Food" : "e.g., Speakers"
                            }
                        />
                        {i >= 2 && (
                            <TouchableOpacity
                                onPress={() => removeOption(i)}
                                style={styles.removeBtn}
                            >
                                <Text style={styles.removeTxt}>Remove option</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ))}

                <TouchableOpacity
                    onPress={addOption}
                    disabled={options.length >= maxOptions}
                    style={[
                        styles.addBtn,
                        options.length >= maxOptions && { opacity: 0.5 },
                    ]}
                >
                    <Text style={styles.addTxt}>
                        {options.length >= maxOptions ? "Max reached" : "+ Add option"}
                    </Text>
                </TouchableOpacity>

                <PrimaryButton title="Create Poll" onPress={createPoll} />

                <View style={{ height: 20 }} />
                <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8 }}>
                    Live polls
                </Text>
                {polls.length === 0 ? (
                    <Text>No polls yet.</Text>
                ) : (
                    polls.map((p) => <PollItem key={p.id} eventId={eventId} poll={p} />)
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function PollItem({ eventId, poll }: { eventId: string; poll: Poll }) {
    const [myVote, setMyVote] = useState<string | null>(null);
    const [counts, setCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, `events/${eventId}/polls/${poll.id}/votes`),
            (snap) => {
                const c: Record<string, number> = {};
                snap.forEach((d) => {
                    const v = d.data() as { optionId: string };
                    c[v.optionId] = (c[v.optionId] || 0) + 1;
                    if (d.id === auth.currentUser?.uid) setMyVote(v.optionId);
                });
                setCounts(c);
            }
        );
        return unsub;
    }, [eventId, poll.id]);

    async function vote(optionId: string) {
        await setDoc(
            doc(db, `events/${eventId}/polls/${poll.id}/votes/${auth.currentUser!.uid}`),
            { optionId, votedAt: Date.now() }
        );
    }

    return (
        <View style={styles.poll}>
            <Text style={styles.question}>{poll.question}</Text>
            {poll.options.map((o) => {
                const n = counts[o.id] || 0;
                const selected = myVote === o.id;
                return (
                    <View
                        key={o.id}
                        style={[styles.opt, selected && { borderColor: "#3b82f6" }]}
                    >
                        <Text style={{ flex: 1 }}>{o.text}</Text>
                        <VoteButton
                            selected={selected}
                            count={n}
                            onPress={() => vote(o.id)}
                        />
                    </View>
                );
            })}
        </View>
    );
}

function VoteButton({
    selected,
    count,
    onPress,
}: {
    selected: boolean;
    count: number;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.voteBtn,
                selected ? styles.voteBtnSelected : styles.voteBtnUnselected,
            ]}
        >
            <Text
                style={[
                    styles.voteBtnText,
                    selected ? styles.voteBtnTextSelected : styles.voteBtnTextUnselected,
                ]}
            >
                {selected ? "Voted" : "Vote"}
            </Text>
            <View
                style={[
                    styles.voteCount,
                    selected ? styles.voteCountSelected : styles.voteCountUnselected,
                ]}
            >
                <Text style={styles.voteCountText}>{count}</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    // cards & form
    poll: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
    },
    question: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
    opt: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        padding: 8,
        marginBottom: 8,
    },
    addBtn: { alignSelf: "flex-start", marginBottom: 12 },
    addTxt: { color: "#2563eb", fontWeight: "600" },
    removeBtn: { marginTop: -4, marginBottom: 8 },
    removeTxt: { color: "#ef4444" },

    // vote pill button
    voteBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 9999,
        borderWidth: 1,
    },
    voteBtnUnselected: { backgroundColor: "#ffffff", borderColor: "#93c5fd" },
    voteBtnSelected: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
    voteBtnText: { fontWeight: "700" },
    voteBtnTextUnselected: { color: "#2563eb" },
    voteBtnTextSelected: { color: "#ffffff" },
    voteCount: {
        marginLeft: 8,
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 6,
    },
    voteCountUnselected: { backgroundColor: "#2563eb" },
    voteCountSelected: { backgroundColor: "rgba(255,255,255,0.2)" },
    voteCountText: { color: "#ffffff", fontWeight: "700" },
});
