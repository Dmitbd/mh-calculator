import type { DataBootstrapManifest } from "@/shared/lib/dataBootstrap";
import { readSupabaseConfig } from "@/shared/lib/supabaseConfig";

import {
  parseHeroBuildSnapshot,
  type ParsedHeroBuildSnapshot,
} from "./heroBuildSnapshot";
import { loadRemoteHeroBuildSnapshot } from "./heroBuildSnapshotRemote";
import {
  loadLastKnownGoodHeroBuildSnapshot,
  saveLastKnownGoodHeroBuildSnapshot,
} from "../storage/heroBuildSnapshotStorage";

import bundledManifest from "@/features/game-data/snapshots/hero-builds/manifest.json";
import bundledResource from "@/features/game-data/snapshots/hero-builds/hero-builds.json";

export type HeroBuildSnapshotSource = {
  snapshot: ParsedHeroBuildSnapshot;
  source: "bundled" | "last-known-good" | "remote";
};

let remoteInFlight: {
  key: string;
  promise: Promise<HeroBuildSnapshotSource>;
} | null = null;

export async function loadHeroBuildSnapshotFallback(): Promise<HeroBuildSnapshotSource> {
  const lastKnownGood = await loadLastKnownGoodHeroBuildSnapshot();
  if (lastKnownGood) {
    return { snapshot: lastKnownGood, source: "last-known-good" };
  }
  return { snapshot: getBundledSnapshot(), source: "bundled" };
}

export async function loadAndCacheRemoteHeroBuildSnapshot(
  manifest: DataBootstrapManifest,
): Promise<HeroBuildSnapshotSource> {
  const config = readSupabaseConfig();
  if (!config) {
    throw new Error("Remote hero build snapshot is not configured");
  }
  const key = `${manifest.contentVersion}\n${manifest.contentUpdatedAt}\n${manifest.resources.heroBuilds.etag}`;
  if (remoteInFlight?.key !== key) {
    const promise = loadRemoteHeroBuildSnapshot({ config, manifest })
      .then(({ files, parsed }) => {
        persistLastKnownGoodInBackground(files);
        return { snapshot: parsed, source: "remote" as const };
      })
      .finally(() => {
        if (remoteInFlight?.promise === promise) remoteInFlight = null;
      });
    remoteInFlight = { key, promise };
  }
  return remoteInFlight.promise;
}

function persistLastKnownGoodInBackground(
  files: Parameters<typeof saveLastKnownGoodHeroBuildSnapshot>[0],
): void {
  try {
    void saveLastKnownGoodHeroBuildSnapshot(files).catch(() => {
      // A persistence failure must not hide a fully validated remote resource.
    });
  } catch {
    // Injectable adapters may fail synchronously before returning a promise.
  }
}

export function getBuildSetFromSnapshot(
  source: HeroBuildSnapshotSource,
  heroId: string,
) {
  return (
    source.snapshot.heroBuilds.find((entry) => entry.heroId === heroId)
      ?.buildSet ?? null
  );
}

function getBundledSnapshot(): ParsedHeroBuildSnapshot {
  return parseBundledHeroBuildSnapshot(bundledManifest, bundledResource);
}

export function parseBundledHeroBuildSnapshot(
  rawManifest: unknown,
  rawResource: unknown,
): ParsedHeroBuildSnapshot {
  return parseHeroBuildSnapshot(
    `${JSON.stringify(rawManifest)}\n`,
    `${JSON.stringify(rawResource)}\n`,
  );
}
