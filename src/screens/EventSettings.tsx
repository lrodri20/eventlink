// screens/EventSettings.tsx
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import TextField from "../components/TextField";
import PrimaryButton from "../components/PrimaryButton";
import { auth } from "../firebase";
import {
    doc,
    onSnapshot,
    setDoc,
    serverTimestamp,
    getFirestore,
} from "firebase/firestore";
import {
    getStorage,
    ref as sRef,
    uploadBytes,
    getDownloadURL,
} from "firebase/storage";

const db = getFirestore();

type Props = {
    navigation: any;
    route: { params: { eventId: string } };
};

type Profile = {
    displayName?: string;
    bio?: string;
    instagram?: string;
    snapchat?: string;
    tiktok?: string;
    twitter?: string; // X
    website?: string;
    photoURL?: string;
};

type AttendeePrefs = {
    uid: string;
    socialScope?: "matches" | "everyone";
};

export default function EventSettings({ navigation, route }: Props) {
    const { eventId } = route.params;
    const uid = auth.currentUser?.uid!;
    const userRef = doc(db, "users", uid);
    const attendeeRef = doc(db, "events", eventId, "attendees", uid);

    // form state
    const [profile, setProfile] = useState<Profile>({});
    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [instagram, setInstagram] = useState("");
    const [snapchat, setSnapchat] = useState("");
    const [tiktok, setTiktok] = useState("");
    const [twitter, setTwitter] = useState("");
    const [website, setWebsite] = useState("");
    const [photoURL, setPhotoURL] = useState<string | undefined>(undefined);

    // event-pref state
    const [socialScope, setSocialScope] = useState<"matches" | "everyone">(
        "matches"
    );

    // ui
    const [saving, setSaving] = useState(false);

    // load profile + attendee prefs
    useEffect(() => {
        const off1 = onSnapshot(userRef, (snap) => {
            const p = (snap.data() as Profile) || {};
            setProfile(p);
            setDisplayName(p.displayName ?? "");
            setBio(p.bio ?? "");
            setInstagram(p.instagram ?? "");
            setSnapchat(p.snapchat ?? "");
            setTiktok(p.tiktok ?? "");
            setTwitter(p.twitter ?? "");
            setWebsite(p.website ?? "");
            setPhotoURL(p.photoURL);
        });
        const off2 = onSnapshot(attendeeRef, (snap) => {
            const a = (snap.data() as AttendeePrefs) || { uid };
            if (a.socialScope === "everyone" || a.socialScope === "matches") {
                setSocialScope(a.socialScope);
            }
        });
        return () => {
            off1();
            off2();
        };
    }, [eventId, uid]);

    async function pickImage() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission required", "We need access to your photos.");
            return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });
        if (res.canceled || !res.assets?.length) return;
        const uri = res.assets[0].uri;

        // preview immediately
        setPhotoURL(uri);

        // upload to Storage
        try {
            const storage = getStorage();
            const r = await fetch(uri);
            const blob = await r.blob();
            const key = `profiles/${uid}.jpg`; // one file per user
            await uploadBytes(sRef(storage, key), blob);
            const url = await getDownloadURL(sRef(storage, key));
            setPhotoURL(url); // switch preview to CDN url
        } catch (e) {
            console.warn("Upload failed:", e);
            Alert.alert("Upload failed", "We couldn't upload your photo right now.");
        }
    }

    async function save() {
        if (!uid) return;
        setSaving(true);
        try {
            // 1) Save user profile
            await setDoc(
                userRef,
                {
                    displayName: displayName.trim(),
                    bio: bio.trim(),
                    instagram: instagram.trim().replace(/^@/, ""),
                    snapchat: snapchat.trim(),
                    tiktok: tiktok.trim().replace(/^@/, ""),
                    twitter: twitter.trim().replace(/^@/, ""),
                    website: website.trim(),
                    photoURL: photoURL ?? null,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            // 2) Save event-visible prefs on attendee doc
            await setDoc(
                attendeeRef,
                {
                    uid,
                    socialScope,
                    // keep them active if they’re here
                    active: true,
                    lastSettingsUpdate: serverTimestamp(),
                },
                { merge: true }
            );

            Alert.alert("Saved", "Your settings have been updated.");
        } catch (e: any) {
            Alert.alert("Couldn't save", e?.message ?? String(e));
        } finally {
            setSaving(false);
        }
    }

    const leaveEvent = () => {
        Alert.alert(
            "Leave event?",
            "You can rejoin later—your matches, likes, chats, and votes stay intact.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Leave",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await setDoc(
                                attendeeRef,
                                { uid, active: false, leftAt: serverTimestamp() },
                                { merge: true }
                            );
                            navigation.reset({ index: 0, routes: [{ name: "Join" }] });
                        } catch (e: any) {
                            Alert.alert("Couldn't leave event", e?.message ?? String(e));
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                <Text style={{ fontSize: 28, fontWeight: "800", marginBottom: 12 }}>
                    Settings
                </Text>

                {/* Avatar */}
                <View style={{ alignItems: "center", marginBottom: 16 }}>
                    <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                        <Image
                            source={
                                photoURL
                                    ? { uri: photoURL }
                                    : require("../assets/avatar-placeholder.png") // add a simple placeholder asset
                            }
                            style={{
                                width: 120,
                                height: 120,
                                borderRadius: 60,
                                borderWidth: 2,
                                borderColor: "#e5e7eb",
                            }}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={pickImage} style={{ marginTop: 8 }}>
                        <Text style={{ color: "#2563eb", fontWeight: "600" }}>
                            {photoURL ? "Change photo" : "Add photo"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Profile basics */}
                <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8 }}>
                    Profile
                </Text>
                <TextField
                    label="Display name"
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Your name"
                />
                <TextField
                    label="Bio"
                    value={bio}
                    onChangeText={setBio}
                    placeholder="A line about you"
                    multiline
                />

                {/* Socials */}
                <Text style={{ fontSize: 18, fontWeight: "800", marginVertical: 12 }}>
                    Socials
                </Text>
                <TextField
                    label="Instagram"
                    value={instagram}
                    onChangeText={setInstagram}
                    placeholder="@username"
                />
                <TextField
                    label="Snapchat"
                    value={snapchat}
                    onChangeText={setSnapchat}
                    placeholder="snap username"
                />
                <TextField
                    label="TikTok"
                    value={tiktok}
                    onChangeText={setTiktok}
                    placeholder="@username"
                />
                <TextField
                    label="X (Twitter)"
                    value={twitter}
                    onChangeText={setTwitter}
                    placeholder="@handle"
                />
                <TextField
                    label="Website"
                    value={website}
                    onChangeText={setWebsite}
                    placeholder="https://example.com"
                />

                <PrimaryButton title="Save settings" onPress={save} />
                <View style={{ height: 8 }} />
                <PrimaryButton title="Leave this event" onPress={leaveEvent} />
                <View style={{ height: Platform.OS === "ios" ? 32 : 16 }} />
            </ScrollView>

            {/* Saving overlay with the picture shown */}
            <Modal visible={saving} transparent animationType="fade">
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.35)",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: 24,
                    }}
                >
                    <View
                        style={{
                            backgroundColor: "#fff",
                            padding: 16,
                            borderRadius: 16,
                            alignItems: "center",
                            width: 260,
                        }}
                    >
                        <Image
                            source={
                                photoURL
                                    ? { uri: photoURL }
                                    : require("../assets/avatar-placeholder.png")
                            }
                            style={{ width: 72, height: 72, borderRadius: 36, marginBottom: 12 }}
                        />
                        <ActivityIndicator size="large" />
                        <Text style={{ marginTop: 8, fontWeight: "600" }}>Saving…</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

/** Small pill toggle */
function TogglePill({
    label,
    active,
    onPress,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? "#2563eb" : "#d1d5db",
                backgroundColor: active ? "rgba(37,99,235,0.1)" : "#fff",
            }}
        >
            <Text style={{ color: active ? "#2563eb" : "#374151", fontWeight: "600" }}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}
