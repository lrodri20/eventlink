import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

export default function PrimaryButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean; }) {
    return (
        <TouchableOpacity style={[styles.btn, disabled && { opacity: 0.5 }]} onPress={onPress} disabled={disabled}>
            <Text style={styles.txt}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: { backgroundColor: "#3b82f6", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
    txt: { color: "white", fontWeight: "600", fontSize: 16 }
});