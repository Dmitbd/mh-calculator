import { Stack, usePathname, useRouter } from "expo-router";

import { AppErrorBoundary } from "../src/shared/ui/AppErrorBoundary";

export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <AppErrorBoundary
      onGoHome={() => router.replace("/")}
      resetKey={pathname}
    >
      <Stack screenOptions={{ headerTitleAlign: "center" }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="divinity" options={{ headerShown: false }} />
        <Stack.Screen name="divinity/manual" options={{ headerShown: false }} />
        <Stack.Screen name="divinity-talents" options={{ headerShown: false }} />
        <Stack.Screen
          name="divinity-talents/manual"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="antiques" options={{ headerShown: false }} />
        <Stack.Screen name="antiques/manual" options={{ headerShown: false }} />
        <Stack.Screen name="summon-rivalry" options={{ headerShown: false }} />
        <Stack.Screen
          name="summon-rivalry/manual"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="weekly-rivalry/beastly-echoes"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="weekly-rivalry/beastly-echoes/manual"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="weekly-rivalry/tower-of-babel"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="weekly-rivalry/tower-of-babel/manual"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="weekly-rivalry/zodiac-map"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="weekly-rivalry/zodiac-map/manual"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="heroes/index" options={{ headerShown: false }} />
        <Stack.Screen name="heroes/[heroId]" options={{ headerShown: false }} />
        <Stack.Screen
          name="admin/branch-builder"
          options={{ headerShown: false }}
        />
      </Stack>
    </AppErrorBoundary>
  );
}
