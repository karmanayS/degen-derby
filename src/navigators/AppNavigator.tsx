import {
  NavigationContainer,
  DarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { HomeNavigator } from "./HomeNavigator";
import { RaceScreen } from "../screens/RaceScreen";
import { ResultsScreen } from "../screens/ResultsScreen";
import { SplashScreen } from "../screens/SplashScreen";
import { useAuthorization } from "../utils/useAuthorization";
import { COLORS } from "../lib/constants";

const Stack = createNativeStackNavigator();

const DegenDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    primary: COLORS.primary,
  },
};

export const AppNavigator = () => {
  const { selectedAccount, isLoading } = useAuthorization();
  const isConnected = !!selectedAccount;

  if (isLoading) {
    return null; // Could show a loading screen here
  }

  return (
    <NavigationContainer theme={DegenDarkTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        {!isConnected ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeNavigator} />
            <Stack.Screen
              name="Race"
              component={RaceScreen}
              options={{
                headerShown: true,
                title: "Race",
                headerStyle: { backgroundColor: COLORS.surface },
                headerTintColor: COLORS.text,
              }}
            />
            <Stack.Screen
              name="Results"
              component={ResultsScreen}
              options={{
                headerShown: true,
                title: "Results",
                headerStyle: { backgroundColor: COLORS.surface },
                headerTintColor: COLORS.text,
                headerBackVisible: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};