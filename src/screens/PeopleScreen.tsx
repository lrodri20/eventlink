import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Alert } from "react-native";
import { auth, db } from "../firebase";
import { Attendee } from "../types";
import { collection, doc, getDocs, onSnapshot, query, setDoc } from "firebase/firestore";
import PersonCard from "../components/PersonCard";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { EventTabParamList } from "./EventTabs";

export default function PeopleScreen({ route }: BottomTabScreenProps<EventTabParamList, "People">) {
    const { eventId } = route.params;
    const [people, setPeople] = useState<Attendee[]>([]);

    useEffect(() => {
        const q = collection(db, `events/${eventId}/attendees`);
        const unsub = onSnapshot(q, snap => {
            const list: Attendee[] = [];
            snap.forEach(d => list.push(d.data() as Attendee));
            setPeople(list);
        });
        return unsub;
    }, [eventId]);

    const others = useMemo(() => people.filter(p => p.uid !== auth.currentUser?.uid), [people]);

    async function like(person: Attendee) {
        const from = auth.currentUser!.uid;
        const to = person.uid;
        const likeId = `${from}_${to}`;
        await setDoc(doc(db, `events/${eventId}/likes/${likeId}`), { from, to, createdAt: Date.now() });

        // check if reverse exists → match
        const reverseId = `${to}_${from}`;
        const reverse = await getDocs(collection(db, `events/${eventId}/likes`));
        const hasReverse = reverse.docs.some(d => d.id === reverseId);
        if (hasReverse) {
            const a = [from, to].sort();
            const matchId = `${a[0]}_${a[1]}`;
            await setDoc(doc(db, `events/${eventId}/matches/${matchId}`), { uids: a, createdAt: Date.now() }, { merge: true });
            Alert.alert("It's a match!", `You and ${person.displayName} liked each other.`);
        }
    }

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8 }}>Attendees</Text>
            <FlatList
                data={others}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => <PersonCard person={item} onLike={like} />}
                ListEmptyComponent={<Text>No one else here yet.</Text>}
            />
        </View>
    );
}