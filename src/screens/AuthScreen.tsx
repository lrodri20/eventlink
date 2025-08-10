import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import PrimaryButton from "../components/PrimaryButton";
import TextField from "../components/TextField";
import { useAuth } from "../hooks/useAuth";
import { setDisplayNameProfile } from "../firebase";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

export default function AuthScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Auth">) {
    const { user, loading } = useAuth();
    const [name, setName] = useState("");
    const headerHeight = useHeaderHeight();

    useEffect(() => {
        if (!loading && user?.displayName) navigation.replace("Join");
    }, [user, loading]);

    async function save() {
        if (!name.trim()) return;
        await setDisplayNameProfile(name.trim());
        navigation.replace("Join");
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={headerHeight}   // keeps content above the nav header
        >
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>What's your name?</Text>
                <TextField
                    label="Display name"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., Luis"
                    autoCapitalize="words"
                />
                <PrimaryButton title="Continue" onPress={save} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    content: { flexGrow: 1, padding: 20, justifyContent: "center" },
    title: { fontSize: 22, fontWeight: "800", marginBottom: 12 }
});
