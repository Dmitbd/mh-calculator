import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="divinity" options={{ headerShown: false }} />
      <Stack.Screen
        name="admin/branch-builder"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
