import type { ImageLoadingTransition } from "../useImageLoadingTransition";

const stableTransition: ImageLoadingTransition = {
  handleError: () => undefined,
  handleLoad: () => undefined,
  phase: "pending",
  prefersReducedMotion: true,
};

export function useImageLoadingTransition(): ImageLoadingTransition {
  return stableTransition;
}
