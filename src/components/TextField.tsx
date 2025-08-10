import React from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";

type Props = {
    label: string;
    value: string;
    onChangeText: (t: string) => void; // you can also use React.Dispatch<React.SetStateAction<string>>
    placeholder?: string;
    autoCapitalize?: TextInputProps["autoCapitalize"];
    multiline?: boolean;          // <-- NEW
    numberOfLines?: number;       // <-- optional helper
    inputStyle?: any;             // <-- optional style override
};

export default function TextField({
    label,
    value,
    onChangeText,
    placeholder,
    autoCapitalize = "sentences",
    multiline = false,
    numberOfLines = 1,
    inputStyle,
}: Props) {
    return (
        <View style={{ marginBottom: 12 }}>
            {!!label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                autoCapitalize={autoCapitalize}
                multiline={multiline}                               // <-- pass through
                numberOfLines={multiline ? Math.max(numberOfLines, 3) : 1}
                style={[
                    styles.input,
                    multiline && styles.inputMultiline,               // <-- top-aligned box
                    inputStyle,
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    label: { fontSize: 12, color: "#6b7280", marginBottom: 4, fontWeight: "600" },
    input: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#fff",
    },
    inputMultiline: {
        minHeight: 100,
        textAlignVertical: "top",
    },
});
