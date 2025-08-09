import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AuthScreen from "../screens/AuthScreen";
import EventJoinScreen from "../screens/EventJoinScreen";
import EventTabs from "../screens/EventTabs";
import ChatScreen from "../screens/ChatsScreen";

export type RootStackParamList = {
    Auth: undefined;
    Join: undefined;
    Event: { eventId: string; eventName: string };
    Chat: { eventId: string; matchId: string; peerUid: string; peerName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Auth" component={AuthScreen} options={{ title: "Welcome" }} />
                <Stack.Screen name="Join" component={EventJoinScreen} options={{ title: "Join Event" }} />
                <Stack.Screen name="Event" component={EventTabs} options={({ route }) => ({ title: route.params.eventName })} />
                <Stack.Screen
                    name="Chat"
                    component={ChatScreen}
                    options={({ route }) => ({ title: route.params.peerName })}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}