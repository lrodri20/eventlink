import React from "react";
import { TextInput, View, Text, StyleSheet } from "react-native";

export default function TextField({ label, value, onChangeText, placeholder, autoCapitalize = "sentences" }: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    placeholder?: string;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
    return (
        <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                autoCapitalize={autoCapitalize}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    label: { marginBottom: 6, color: "#334155" },
    input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, padding: 12, fontSize: 16 }
});