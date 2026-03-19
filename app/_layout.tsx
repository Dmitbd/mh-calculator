import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="divinity" options={{ headerShown: false }} />
    </Stack>
  );
}
