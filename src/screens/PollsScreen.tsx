import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Modal,
    Alert,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import TextField from "../components/TextField";
import PrimaryButton from "../components/PrimaryButton";
import { auth, db } from "../firebase";
import { Poll } from "../types";
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { EventTabParamList } from "./EventTabs";
import { Feather } from "@expo/vector-icons";
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
    const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
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
        <View
            style={{ flex: 1 }}
            {...(Platform.OS === "ios"
                ? { automaticallyAdjustKeyboardInsets: true }
                : {})}
        >
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
                        polls.map((p) => (
                            <PollItem key={p.id} eventId={eventId} poll={p} onEdit={setEditingPoll} />
                        ))
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
            <EditPollModal
                visible={!!editingPoll}
                poll={editingPoll}
                eventId={eventId}
                onClose={() => setEditingPoll(null)}
            />
        </View >
    );
}

function PollItem({
    eventId,
    poll,
    onEdit,
}: {
    eventId: string;
    poll: Poll;
    onEdit: (p: Poll) => void;
}) {
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

    const isCreator = auth.currentUser?.uid === poll.createdBy;

    async function vote(optionId: string) {
        await setDoc(
            doc(db, `events/${eventId}/polls/${poll.id}/votes/${auth.currentUser!.uid}`),
            { optionId, votedAt: Date.now() }
        );
    }
    async function onDelete() {
        if (!isCreator) return;
        Alert.alert("Delete poll?", "This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    await deleteDoc(doc(db, `events/${eventId}/polls/${poll.id}`));
                },
            },
        ]);
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
                        <PrimaryButton
                            title={selected ? "Voted" : "Vote"}
                            onPress={() => vote(o.id)}
                        />
                        <Text style={{ marginLeft: 8 }}>{n}</Text>
                    </View>
                );
            })}

            {isCreator && (
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => onEdit(poll)} style={[styles.actionBtn]}>
                        <Text style={{ color: "#2563eb", fontWeight: "600" }}>Edit poll</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onDelete}
                        style={[styles.actionBtn]}
                        accessibilityLabel="Delete poll"
                    >
                        <Text style={[styles.actionText, { color: "#ef4444" }]}>Delete</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

function EditPollModal({
    visible,
    poll,
    eventId,
    onClose,
}: {
    visible: boolean;
    poll: Poll | null;
    eventId: string;
    onClose: () => void;
}) {
    const [question, setQuestion] = useState(poll?.question ?? "");
    const [options, setOptions] = useState(poll?.options ?? []);
    const [hasVotes, setHasVotes] = useState(false);
    const maxOptions = 4;

    useEffect(() => {
        if (!poll) return;
        setQuestion(poll.question);
        setOptions(poll.options);
        const unsub = onSnapshot(
            collection(db, `events/${eventId}/polls/${poll.id}/votes`),
            (snap) => setHasVotes(!snap.empty)
        );
        return unsub;
    }, [poll?.id]);

    function setOpt(i: number, text: string) {
        setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, text } : o)));
    }

    function addOpt() {
        if (hasVotes || options.length >= maxOptions) return;
        setOptions((prev) => [...prev, { id: uid(), text: "" }]);
    }

    function removeOpt(i: number) {
        if (hasVotes || options.length <= 2) return;
        setOptions((prev) => prev.filter((_, idx) => idx !== i));
    }

    async function save() {
        if (!poll) return;
        const filled = options.map((o) => ({ ...o, text: o.text.trim() })).filter((o) => o.text);
        if (!question.trim() || filled.length < 2) return;

        await updateDoc(doc(db, `events/${eventId}/polls/${poll.id}`), {
            question: question.trim(),
            options: hasVotes ? options : filled.slice(0, maxOptions), // keep IDs; rules enforce count when votes exist
        });

        onClose();
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.modalCard}
                >
                    <ScrollView
                        contentContainerStyle={{ padding: 16 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 8 }}>
                            Edit poll
                        </Text>

                        <TextField label="Question" value={question} onChangeText={setQuestion} />

                        {options.map((o, i) => (
                            <View key={o.id} style={{ marginBottom: 8 }}>
                                <TextField
                                    label={`Option ${String.fromCharCode(65 + i)}`}
                                    value={o.text}
                                    onChangeText={(t) => setOpt(i, t)}
                                />
                                {!hasVotes && i >= 2 && (
                                    <TouchableOpacity onPress={() => removeOpt(i)} style={{ marginTop: -4 }}>
                                        <Text style={{ color: "#ef4444" }}>Remove option</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}

                        {!hasVotes && (
                            <TouchableOpacity
                                onPress={addOpt}
                                disabled={options.length >= maxOptions}
                                style={{ marginBottom: 8 }}
                            >
                                <Text style={{ color: "#2563eb", fontWeight: "600" }}>
                                    {options.length >= maxOptions ? "Max 4 options" : "+ Add option"}
                                </Text>
                            </TouchableOpacity>
                        )}

                        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 16 }}>
                            <TouchableOpacity onPress={onClose}>
                                <Text>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={save}>
                                <Text style={{ color: "#2563eb", fontWeight: "700" }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
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
    removeBtn: { marginTop: 0, marginBottom: 8 },
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
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        justifyContent: "center",
        padding: 16,
    },
    modalCard: {
        backgroundColor: "white",
        borderRadius: 18,
        maxHeight: "85%",
        overflow: "hidden",
    },
    actions: {
        marginTop: 4,
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    actionText: {
        fontWeight: "600",
        color: "#2563eb",
    },
});
