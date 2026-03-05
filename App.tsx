// Polyfills — must be first import
import "./src/polyfills";

import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ConnectionProvider } from "./src/utils/ConnectionProvider";
import { ClusterProvider } from "./src/components/cluster/cluster-data-access";
import { AppNavigator } from "./src/navigators/AppNavigator";
import { COLORS } from "./src/lib/constants";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClusterProvider>
        <ConnectionProvider config={{ commitment: "processed" }}>
          <SafeAreaView style={styles.shell}>
            <AppNavigator />
          </SafeAreaView>
        </ConnectionProvider>
      </ClusterProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});