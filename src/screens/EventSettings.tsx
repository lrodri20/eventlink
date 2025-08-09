// screens/EventSettings.tsx
import React from "react";
import { View, Text, Alert } from "react-native";
import { auth, db } from "../firebase";
import { doc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import PrimaryButton from "../components/PrimaryButton"; // use your button component

type Props = {
    navigation: any;
    route: { params: { eventId: string } };
};

export default function EventSettings({ navigation, route }: Props) {
    const { eventId } = route.params;

    const goEditProfile = () => {
        navigation.navigate("EditProfile"); // or your existing profile screen
    };

    const leaveEvent = async () => {
        Alert.alert(
            "Leave event?",
            "You can rejoin later—your matches, likes, chats, and votes stay intact.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Leave",
                    style: "destructive",
                    onPress: async () => {
                        const uid = auth.currentUser?.uid;
                        if (!uid) return;

                        try {
                            // Mark attendee inactive (do NOT delete)
                            await setDoc(
                                doc(db, "events", eventId, "attendees", uid),
                                {
                                    uid,                 // keep uid on the doc
                                    active: false,       // <-- key bit
                                    leftAt: serverTimestamp(),
                                },
                                { merge: true }
                            );

                            // bounce back to Join (EventTabs unmounts, presence hook cleans up)
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
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 8 }}>
                Settings
            </Text>

            <PrimaryButton title="Edit profile" onPress={goEditProfile} />
            <PrimaryButton title="Leave this event" onPress={leaveEvent} />

            {/* Optional app sign-out if you want it here too */}
            {/* <PrimaryButton title="Sign out of app" onPress={() => auth.signOut()} /> */}
        </View>
    );
}
