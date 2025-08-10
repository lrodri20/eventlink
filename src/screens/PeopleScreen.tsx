import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Alert } from "react-native";
import { auth, db } from "../firebase";
import { Attendee } from "../types";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    setDoc,
    where,
} from "firebase/firestore";
import PersonCard from "../components/PersonCard";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { EventTabParamList } from "./EventTabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = CompositeScreenProps<
    BottomTabScreenProps<EventTabParamList, "People">,
    NativeStackScreenProps<RootStackParamList>
>;

type MatchMap = Record<string, { matchId: string }>; // peerUid -> matchId

export default function PeopleScreen({ route, navigation }: Props) {
    const { eventId } = route.params;
    const me = auth.currentUser!.uid;

    const [people, setPeople] = useState<Attendee[]>([]);
    const [myLikesTo, setMyLikesTo] = useState<Set<string>>(new Set());
    const [myMatches, setMyMatches] = useState<MatchMap>({});

    // Live attendees (seen in the last hour)
    useEffect(() => {
        const cutoff = Date.now() - 60 * 60 * 1000;
        const qPeople = query(
            collection(db, `events/${eventId}/attendees`),
            where("lastSeenMs", ">=", cutoff)
        );
        const unsub = onSnapshot(qPeople, (snap) => {
            const list: Attendee[] = [];
            snap.forEach((d) => list.push(d.data() as Attendee));
            setPeople(list);
        });
        return unsub;
    }, [eventId]);

    // My outbound likes (so we can show "Liked" state)
    useEffect(() => {
        const qLikes = query(
            collection(db, `events/${eventId}/likes`),
            where("from", "==", me)
        );
        const unsub = onSnapshot(qLikes, (snap) => {
            const s = new Set<string>();
            snap.forEach((d) => s.add((d.data() as any).to));
            setMyLikesTo(s);
        });
        return unsub;
    }, [eventId, me]);

    // My matches → map peerUid -> matchId, and ensure a chat doc exists for each match
    useEffect(() => {
        const qMatches = query(
            collection(db, `events/${eventId}/matches`),
            where("uids", "array-contains", me)
        );
        const unsub = onSnapshot(qMatches, async (snap) => {
            const map: MatchMap = {};
            const toEnsure: Array<{ id: string; uids: [string, string] }> = [];

            snap.forEach((d) => {
                const uids = (d.data() as any).uids as [string, string];
                const peer = uids[0] === me ? uids[1] : uids[0];
                map[peer] = { matchId: d.id };
                toEnsure.push({ id: d.id, uids: [uids[0], uids[1]] });
            });

            setMyMatches(map);

            // Ensure chats/{matchId} exists for every match (creates after matches doc, so rules allow it)
            await Promise.all(
                toEnsure.map(async ({ id, uids }) => {
                    const chatRef = doc(db, `events/${eventId}/chats/${id}`);
                    const s = await getDoc(chatRef);
                    if (!s.exists()) {
                        await setDoc(chatRef, {
                            uids: [uids[0], uids[1]].sort(),
                            createdAt: Date.now(),
                            lastMessage: "",
                            lastMessageAt: 0,
                        });
                    }
                })
            );
        });
        return unsub;
    }, [eventId, me]);

    const others = useMemo(
        () => people.filter((p) => p.uid !== me),
        [people, me]
    );

    /** Like someone → if reverse like exists, create match AND chat immediately */
    async function like(person: Attendee) {
        const to = person.uid;
        const likeId = `${me}_${to}`;
        await setDoc(doc(db, `events/${eventId}/likes/${likeId}`), {
            from: me,
            to,
            createdAt: Date.now(),
        });

        // See if they already liked me (reverse like)
        const reverseId = `${to}_${me}`;
        const rDoc = await getDoc(doc(db, `events/${eventId}/likes/${reverseId}`));
        if (rDoc.exists()) {
            const pair = [me, to].sort() as [string, string];
            const matchId = `${pair[0]}_${pair[1]}`;

            // 1) Create/merge match
            await setDoc(
                doc(db, `events/${eventId}/matches/${matchId}`),
                { uids: pair, createdAt: Date.now() },
                { merge: true }
            );

            // 2) Immediately ensure the chat exists (rules allow since match now exists)
            await setDoc(
                doc(db, `events/${eventId}/chats/${matchId}`),
                {
                    uids: pair,
                    createdAt: Date.now(),
                    lastMessage: "",
                    lastMessageAt: 0,
                },
                { merge: true }
            );

            Alert.alert("It's a match!", `You and ${person.displayName} liked each other.`);
        }
    }

    /** Open chat → ensure chat doc exists, then navigate (use parent stack) */
    async function openChat(peer: Attendee) {
        const pair = [me, peer.uid].sort() as [string, string];
        const chatId = myMatches[peer.uid]?.matchId || `${pair[0]}_${pair[1]}`;
        const chatRef = doc(db, `events/${eventId}/chats/${chatId}`);

        try {
            const chatSnap = await getDoc(chatRef);
            if (!chatSnap.exists()) {
                await setDoc(chatRef, {
                    uids: pair,
                    createdAt: Date.now(),
                    lastMessage: "",
                    lastMessageAt: 0,
                });
            }
        } catch (e) {
            console.warn("[openChat] could not ensure chat doc:", e);
        }

        navigation.getParent()?.navigate("Chat", {
            eventId,
            matchId: chatId,
            peerUid: peer.uid,
            peerName: peer.displayName,
        });
    }

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8 }}>
                Attendees
            </Text>
            <FlatList
                data={others}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => (
                    <PersonCard
                        person={item}
                        matched={Boolean(myMatches[item.uid])}
                        liked={myLikesTo.has(item.uid)}
                        onLike={like}
                        onOpenChat={openChat}
                        onPressName={(p) =>
                            navigation.getParent()?.navigate("Profile", {
                                eventId,
                                uid: p.uid,
                            })
                        }
                    />
                )}
                ListEmptyComponent={<Text>No one else here yet.</Text>}
            />
        </View>
    );
}
