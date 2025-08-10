// screens/ProfileScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    Alert,
    Linking,
} from "react-native";
import { auth, db } from "../firebase";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

type Profile = {
    displayName?: string;
    bio?: string;
    instagram?: string;
    snapchat?: string;
    tiktok?: string;
    twitter?: string;
    website?: string;
    photoURL?: string;
};

function Chip({ label, onPress }: { label: string; onPress?: () => void }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                marginRight: 8,
                marginBottom: 8,
            }}
        >
            <Text style={{ fontWeight: "600" }}>{label}</Text>
        </TouchableOpacity>
    );
}

export default function ProfileScreen({ route, navigation }: Props) {
    const { eventId, uid } = route.params;
    const me = auth.currentUser!.uid;

    const [profile, setProfile] = useState<Profile>({});
    const [lastSeenMs, setLastSeenMs] = useState<number | null>(null);
    const [isMatched, setIsMatched] = useState(false);

    // load profile + attendee info + match state
    useEffect(() => {
        const userRef = doc(db, "users", uid);
        const unsubUser = onSnapshot(userRef, (snap) => {
            setProfile((snap.data() as Profile) || {});
        });

        const attRef = doc(db, `events/${eventId}/attendees/${uid}`);
        const unsubAtt = onSnapshot(attRef, (snap) => {
            const d = snap.data();
            if (d?.lastSeenMs) setLastSeenMs(d.lastSeenMs);
            if (!profile.displayName && d?.displayName) {
                setProfile((p) => ({ ...p, displayName: d.displayName }));
            }
        });

        const pair = [me, uid].sort() as [string, string];
        const matchId = `${pair[0]}_${pair[1]}`;
        const unsubMatch = onSnapshot(
            doc(db, `events/${eventId}/matches/${matchId}`),
            (snap) => setIsMatched(snap.exists())
        );

        return () => {
            unsubUser();
            unsubAtt();
            unsubMatch();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId, uid]);

    const isMe = me === uid;

    function ago(ms: number | null) {
        if (!ms) return "—";
        const d = Date.now() - ms;
        const m = Math.max(1, Math.round(d / 60000));
        if (m < 60) return `${m}m ago`;
        const h = Math.round(m / 60);
        return `${h}h ago`;
    }

    async function ensureChatAndOpen() {
        const pair = [me, uid].sort() as [string, string];
        const chatId = `${pair[0]}_${pair[1]}`;
        const chatRef = doc(db, `events/${eventId}/chats/${chatId}`);
        const snap = await getDoc(chatRef);
        if (!snap.exists()) {
            await setDoc(chatRef, {
                uids: pair,
                createdAt: Date.now(),
                lastMessage: "",
                lastMessageAt: 0,
            });
        }
        // Replace Profile -> Chat so Back returns to EventTabs
        navigation.replace("Chat", {
            eventId,
            matchId: chatId,
            peerUid: uid,
            peerName: profile.displayName ?? "Friend",
        });
    }

    async function like() {
        const likeId = `${me}_${uid}`;
        await setDoc(doc(db, `events/${eventId}/likes/${likeId}`), {
            from: me,
            to: uid,
            createdAt: Date.now(),
        });

        // Check reverse like to auto-create match + chat
        const reverseId = `${uid}_${me}`;
        const r = await getDoc(doc(db, `events/${eventId}/likes/${reverseId}`));
        if (r.exists()) {
            const pair = [me, uid].sort() as [string, string];
            const matchId = `${pair[0]}_${pair[1]}`;
            await setDoc(
                doc(db, `events/${eventId}/matches/${matchId}`),
                { uids: pair, createdAt: Date.now() },
                { merge: true }
            );
            await setDoc(
                doc(db, `events/${eventId}/chats/${matchId}`),
                { uids: pair, createdAt: Date.now(), lastMessage: "", lastMessageAt: 0 },
                { merge: true }
            );
            setIsMatched(true);
            Alert.alert(
                "It’s a match!",
                `You and ${profile.displayName || "this user"} like each other.`
            );
        } else {
            Alert.alert("Liked", "We’ll let you know if you both like each other.");
        }
    }

    // Build a keyed list for socials (prevents "unique key" warnings)
    type SocialItem = { key: string; label: string; onPress?: () => void };
    const socials = useMemo<SocialItem[]>(() => {
        const items: SocialItem[] = [];

        const ig = profile.instagram?.replace(/^@/, "");
        const tt = profile.tiktok?.replace(/^@/, "");
        const tw = profile.twitter?.replace(/^@/, "");
        const sc = profile.snapchat;
        const web = profile.website;

        if (ig)
            items.push({
                key: `ig-${ig}`,
                label: `Instagram @${ig}`,
                onPress: () => Linking.openURL(`https://instagram.com/${ig}`),
            });
        if (sc)
            items.push({
                key: `sc-${sc}`,
                label: `Snap ${sc}`,
            });
        if (tt)
            items.push({
                key: `tt-${tt}`,
                label: `TikTok @${tt}`,
                onPress: () => Linking.openURL(`https://tiktok.com/@${tt}`),
            });
        if (tw)
            items.push({
                key: `x-${tw}`,
                label: `X @${tw}`,
                onPress: () => Linking.openURL(`https://x.com/${tw}`),
            });
        if (web)
            items.push({
                key: `web-${web}`,
                label: "Website",
                onPress: () => Linking.openURL(web),
            });

        return items;
    }, [profile.instagram, profile.snapchat, profile.tiktok, profile.twitter, profile.website]);

    return (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Hero */}
            <View style={{ alignItems: "center", marginBottom: 16 }}>
                <Image
                    source={
                        profile.photoURL
                            ? { uri: profile.photoURL }
                            : require("../assets/avatar-placeholder.png")
                    }
                    style={{
                        width: 128,
                        height: 128,
                        borderRadius: 64,
                        borderWidth: 2,
                        borderColor: "#e5e7eb",
                    }}
                />
                <Text style={{ fontSize: 24, fontWeight: "800", marginTop: 12 }}>
                    {profile.displayName ?? "Unnamed"}
                </Text>
                <Text style={{ opacity: 0.6, marginTop: 4 }}>
                    Last seen {ago(lastSeenMs)}
                </Text>
            </View>

            {/* Actions */}
            {!isMe ? (
                <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                    <View style={{ flex: 1 }}>
                        <PrimaryButton
                            title={isMatched ? "Open Chat" : "Message"}
                            onPress={ensureChatAndOpen}
                        />
                    </View>
                    {!isMatched && (
                        <View style={{ width: 120 }}>
                            <SecondaryButton title="Like" onPress={like} />
                        </View>
                    )}
                </View>
            ) : (
                <PrimaryButton
                    title="Edit My Profile"
                    onPress={() => navigation.navigate("EventSettings", { eventId })}
                />
            )}

            {/* About */}
            {profile.bio ? (
                <>
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: "800",
                            marginTop: 8,
                            marginBottom: 6,
                        }}
                    >
                        About
                    </Text>
                    <Text style={{ fontSize: 16, lineHeight: 22 }}>{profile.bio}</Text>
                </>
            ) : null}

            {/* Socials */}
            {socials.length ? (
                <>
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: "800",
                            marginTop: 16,
                            marginBottom: 8,
                        }}
                    >
                        Socials
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                        {socials.map((s) => (
                            <Chip key={s.key} label={s.label} onPress={s.onPress} />
                        ))}
                    </View>
                </>
            ) : null}

            <View style={{ height: 24 }} />
        </ScrollView>
    );
}
