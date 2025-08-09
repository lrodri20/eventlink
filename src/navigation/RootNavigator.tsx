import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AuthScreen from "../screens/AuthScreen";
import EventJoinScreen from "../screens/EventJoinScreen";
import EventTabs from "../screens/EventTabs";
import ChatScreen from "../screens/ChatsScreen";
import EventSettings from "../screens/EventSettings";
import { View, Text, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons"; // flat settings icon

export type RootStackParamList = {
    Auth: undefined;
    Join: undefined;
    Event: { eventId: string; eventName: string };
    Chat: { eventId: string; matchId: string; peerUid: string; peerName: string };
    EventSettings: { eventId: string };
    EditProfile: undefined; // if you have it
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Auth" component={AuthScreen} options={{ title: "Welcome" }} />
                <Stack.Screen name="Join" component={EventJoinScreen} options={{ title: "Join Event" }} />
                <Stack.Screen
                    name="Event"
                    component={EventTabs}
                    options={({ route, navigation }) => {
                        const { eventId, eventName, eventCode } = route.params as any;
                        const title =
                            eventName ?? eventCode ?? `Event ${String(eventId).slice(0, 8).toUpperCase()}`;

                        return {
                            headerTitleAlign: "center",
                            headerTitle: () => (
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    <Text style={{ fontSize: 17, fontWeight: "700" }}>{title}</Text>
                                    <Pressable
                                        onPress={() => navigation.navigate("EventSettings", { eventId })}
                                        hitSlop={10}
                                        style={{ marginLeft: 8 }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Event settings"
                                    >
                                        <Feather name="settings" size={20} />
                                    </Pressable>
                                </View>
                            ),
                        };
                    }}
                />
                <Stack.Screen
                    name="Chat"
                    component={ChatScreen}
                    options={({ route }) => ({ title: route.params.peerName })}
                />
                <Stack.Screen
                    name="EventSettings"
                    component={EventSettings}
                    options={{ title: "Settings", presentation: "modal" }} // modal feels nice here
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}