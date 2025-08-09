import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import PeopleScreen from "./PeopleScreen";
import PollsScreen from "./PollsScreen";
import StatsScreen from "./StatsScreen";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

export type EventTabParamList = {
    People: { eventId: string };
    Polls: { eventId: string };
    Stats: { eventId: string };
};

const Tab = createBottomTabNavigator<EventTabParamList>();

export default function EventTabs({ route }: NativeStackScreenProps<RootStackParamList, "Event">) {
    const { eventId } = route.params;
    return (
        <Tab.Navigator>
            <Tab.Screen name="People" component={PeopleScreen} initialParams={{ eventId }} />
            <Tab.Screen name="Polls" component={PollsScreen} initialParams={{ eventId }} />
            <Tab.Screen name="Stats" component={StatsScreen} initialParams={{ eventId }} />
        </Tab.Navigator>
    );
}