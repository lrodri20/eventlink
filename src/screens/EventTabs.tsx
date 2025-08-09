import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import PeopleScreen from "./PeopleScreen";
import PollsScreen from "./PollsScreen";
import StatsScreen from "./StatsScreen";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { usePresence } from "../hooks/usePresence";
export type EventTabParamList = {
    People: { eventId: string };
    Polls: { eventId: string };
    Stats: { eventId: string };
};

const Tab = createBottomTabNavigator<EventTabParamList>();

export default function EventTabs({ route }: NativeStackScreenProps<RootStackParamList, "Event">) {
    const { eventId } = route.params;
    usePresence(eventId);
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    if (route.name === "People") {
                        return <Ionicons name="people" size={size} color={color} />;
                    } else if (route.name === "Polls") {
                        return <MaterialIcons name="poll" size={size} color={color} />;
                    } else if (route.name === "Stats") {
                        return <FontAwesome5 name="chart-bar" size={size} color={color} />;
                    }
                    return null;
                },
                tabBarActiveTintColor: "#007aff",
                tabBarInactiveTintColor: "gray",
            })}
        >
            <Tab.Screen name="People" component={PeopleScreen} initialParams={{ eventId }} />
            <Tab.Screen name="Polls" component={PollsScreen} initialParams={{ eventId }} />
            <Tab.Screen name="Stats" component={StatsScreen} initialParams={{ eventId }} />
        </Tab.Navigator>
    );
}