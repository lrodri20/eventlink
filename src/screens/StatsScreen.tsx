import React, { useEffect, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Poll } from "../types";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { EventTabParamList } from "./EventTabs";
import { VictoryBar, VictoryChart, VictoryAxis, VictoryLabel } from "victory-native";

export default function StatsScreen({ route }: BottomTabScreenProps<EventTabParamList, "Stats">) {
    const { eventId } = route.params;
    const [polls, setPolls] = useState<Poll[]>([]);
    const [counts, setCounts] = useState<Record<string, Record<string, number>>>({});

    useEffect(() => {
        const unsubPolls = onSnapshot(collection(db, `events/${eventId}/polls`), (snap) => {
            const list: Poll[] = [];
            snap.forEach((d) => list.push(d.data() as Poll));
            list.sort((a, b) => b.createdAt - a.createdAt);
            setPolls(list);
        });
        return unsubPolls;
    }, [eventId]);

    useEffect(() => {
        const unsubs = polls.map((p) =>
            onSnapshot(collection(db, `events/${eventId}/polls/${p.id}/votes`), (snap) => {
                const c: Record<string, number> = {};
                snap.forEach((d) => {
                    const v = d.data() as { optionId: string };
                    c[v.optionId] = (c[v.optionId] || 0) + 1;
                });
                setCounts((prev) => ({ ...prev, [p.id]: c }));
            })
        );
        return () => unsubs.forEach((u) => u());
    }, [eventId, polls.map((p) => p.id).join(",")]);

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8 }}>Live stats</Text>
            <FlatList
                data={polls}
                keyExtractor={(p) => p.id}
                renderItem={({ item }) => <PollChart poll={item} counts={counts[item.id] || {}} />}
            />
        </View>
    );
}

function wrapLabel(text: string, maxLineLen = 12) {
    if (!text) return text;
    const words = String(text).split(" ");
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
        const next = line ? `${line} ${w}` : w;
        if (next.length > maxLineLen) {
            if (line) lines.push(line);
            line = w;
        } else {
            line = next;
        }
    }
    if (line) lines.push(line);
    return lines.join("\n");
}

function PollChart({ poll, counts }: { poll: Poll; counts: Record<string, number> }) {
    const data = poll.options.map((o) => ({ option: o.text, votes: counts[o.id] || 0 }));
    return (
        <View style={{ marginBottom: 24 }}>
            <Text style={{ fontWeight: "700", marginBottom: 8 }}>{poll.question}</Text>
            <VictoryChart
                domainPadding={{ x: [30, 30], y: 20 }}
                padding={{ top: 10, right: 20, bottom: 110, left: 40 }} // extra space for multi-line labels
            >
                <VictoryAxis
                    tickFormat={(t) => (typeof t === "string" ? wrapLabel(t, 12) : t)}
                    tickLabelComponent={<VictoryLabel angle={0} dy={6} />}
                    style={{ tickLabels: { fontSize: 12 } }}
                />
                <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 12 } }} />
                <VictoryBar data={data} x="option" y="votes" />
            </VictoryChart>
        </View>
    );
}
