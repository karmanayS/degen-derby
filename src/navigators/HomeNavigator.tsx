import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { LobbyScreen } from "../screens/LobbyScreen";
import { LeaderboardScreen } from "../screens/LeaderboardScreen";
import { ProfileScreen } from "../screens/ProfileScreen";

const T = {
  tabBg: "#1A1209",
  borderColor: "#2A1A0D",
  gold: "#D4A84B",
  muted: "#4E342E",
};

const Tab = createBottomTabNavigator();

export function HomeNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: T.tabBg,
          borderTopColor: T.borderColor,
          borderTopWidth: 1,
          height: 68 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
        },
        tabBarActiveTintColor: T.gold,
        tabBarInactiveTintColor: T.muted + "AA",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "800",
          letterSpacing: 0.5,
        },
      }}
    >
      <Tab.Screen
        name="Lobby"
        component={LobbyScreen}
        options={{
          tabBarLabel: "Races",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcon name="horse-variant-fast" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          headerShown: true,
          title: "LEADERBOARD",
          headerStyle: { backgroundColor: "#0F1A12", shadowColor: "transparent", elevation: 0 } as any,
          headerTintColor: "#D7C29E",
          headerTitleStyle: { fontWeight: "900", fontSize: 16 },
          headerTitleAlign: "center",
          tabBarLabel: "Leaderboard",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcon name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcon name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}