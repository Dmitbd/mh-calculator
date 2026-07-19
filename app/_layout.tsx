import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="index" options={{ title: "MH Calculator" }} />
      <Stack.Screen name="divinity" options={{ headerShown: false }} />
      <Stack.Screen name="divinity/manual" options={{ headerShown: false }} />
      <Stack.Screen name="heroes/index" options={{ headerShown: false }} />
      <Stack.Screen name="heroes/[heroId]" options={{ headerShown: false }} />
      <Stack.Screen
        name="admin/branch-builder"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
