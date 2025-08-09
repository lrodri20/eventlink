import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AuthScreen from "../screens/AuthScreen";
import EventJoinScreen from "../screens/EventJoinScreen";
import EventTabs from "../screens/EventTabs";

export type RootStackParamList = {
    Auth: undefined;
    Join: undefined;
    Event: { eventId: string; eventName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen name="Auth" component={AuthScreen} options={{ title: "Welcome" }} />
                <Stack.Screen name="Join" component={EventJoinScreen} options={{ title: "Join Event" }} />
                <Stack.Screen name="Event" component={EventTabs} options={({ route }) => ({ title: route.params.eventName })} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}