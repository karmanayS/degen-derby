// Polyfills — must be first import
import "./src/polyfills";

import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";

import { ConnectionProvider } from "./src/utils/ConnectionProvider";
import { ClusterProvider } from "./src/components/cluster/cluster-data-access";
import { AppNavigator } from "./src/navigators/AppNavigator";
import { COLORS } from "./src/lib/constants";

const queryClient = new QueryClient();

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#00FF88", backgroundColor: "#1A1A12", borderColor: "#3A3A28", borderWidth: 1 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ color: "#EDEDED", fontSize: 14, fontWeight: "700" }}
      text2Style={{ color: "#C2A878", fontSize: 12, fontWeight: "500" }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: "#FF4444", backgroundColor: "#1A1A12", borderColor: "#3A3A28", borderWidth: 1 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ color: "#EDEDED", fontSize: 14, fontWeight: "700" }}
      text2Style={{ color: "#C2A878", fontSize: 12, fontWeight: "500" }}
    />
  ),
  info: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#F0D050", backgroundColor: "#1A1A12", borderColor: "#3A3A28", borderWidth: 1 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ color: "#EDEDED", fontSize: 14, fontWeight: "700" }}
      text2Style={{ color: "#C2A878", fontSize: 12, fontWeight: "500" }}
    />
  ),
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClusterProvider>
        <ConnectionProvider config={{ commitment: "processed" }}>
          <SafeAreaView style={styles.shell}>
            <AppNavigator />
          </SafeAreaView>
          <Toast config={toastConfig} topOffset={60} />
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