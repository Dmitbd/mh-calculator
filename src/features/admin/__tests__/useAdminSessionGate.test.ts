import { act, renderHook } from "@testing-library/react-native";

import { useAdminSessionGate } from "../hooks/useAdminSessionGate";

const adminSession = { id: "admin", email: "admin@example.com", role: "admin" as const };

describe("useAdminSessionGate", () => {
  it("blocks the gate until the restored admin session is accepted", async () => {
    let resolve!: (session: typeof adminSession) => void;
    const restore = jest.fn(() => new Promise<typeof adminSession>((done) => { resolve = done; }));
    const client = {};
    const getClient = () => client;
    const { result } = renderHook(() => useAdminSessionGate({ getClient, restore }));

    expect(result.current.isChecked).toBe(false);
    await act(async () => { resolve(adminSession); });

    expect(result.current.session).toEqual(adminSession);
    expect(result.current.isChecked).toBe(true);
  });

  it("treats a missing backend as a checked signed-out gate", async () => {
    const getClient = () => null;
    const restore = jest.fn();
    const { result } = renderHook(() => useAdminSessionGate({ getClient, restore }));
    await act(async () => {});

    expect(result.current).toMatchObject({ isChecked: true, session: null });
  });
});
