import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useHeroBuildStatusQuery } from "../hooks/useHeroBuildStatusQuery";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe("useHeroBuildStatusQuery", () => {
  it("ignores an older response after a newer refresh wins", async () => {
    const first = createDeferred<{ draftHeroIds: string[]; publishedHeroIds: string[] }>();
    const second = createDeferred<{ draftHeroIds: string[]; publishedHeroIds: string[] }>();
    const fetchIds = jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const client = {};
    const { result } = renderHook(() => useHeroBuildStatusQuery({ client, enabled: false, fetchIds }));
    await act(async () => {});

    let firstLoad!: Promise<boolean>;
    let secondLoad!: Promise<boolean>;
    act(() => {
      firstLoad = result.current.load();
      secondLoad = result.current.load();
    });
    await act(async () => { second.resolve({ draftHeroIds: [], publishedHeroIds: ["bastet"] }); await secondLoad; });
    await act(async () => { first.resolve({ draftHeroIds: ["morana"], publishedHeroIds: [] }); await firstLoad; });

    expect(result.current.ids).toEqual({ draftHeroIds: [], publishedHeroIds: ["bastet"] });
  });

  it("keeps accepted ids when a preserving refresh fails", async () => {
    const fetchIds = jest.fn()
      .mockResolvedValueOnce({ draftHeroIds: ["bastet"], publishedHeroIds: [] })
      .mockRejectedValueOnce(new Error("offline"));
    const client = {};
    const { result } = renderHook(() => useHeroBuildStatusQuery({ client, enabled: false, fetchIds }));
    await act(async () => {});

    await act(async () => { await result.current.load(); });
    await act(async () => { await result.current.load({ preserveCurrentIdsOnError: true }); });

    await waitFor(() => expect(result.current.error).toBe("offline"));
    expect(result.current.ids.draftHeroIds).toEqual(["bastet"]);
  });
});
