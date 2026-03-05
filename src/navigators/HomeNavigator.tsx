import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { LobbyScreen } from "../screens/LobbyScreen";
import { LeaderboardScreen } from "../screens/LeaderboardScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { COLORS } from "../lib/constants";

const Tab = createBottomTabNavigator();

export function HomeNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.background,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}
    >
      <Tab.Screen
        name="Lobby"
        component={LobbyScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcon
              name="horse-variant-fast"
              size={size}
              color={color}
            />
          ),
          tabBarLabel: "Races",
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcon name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcon name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}