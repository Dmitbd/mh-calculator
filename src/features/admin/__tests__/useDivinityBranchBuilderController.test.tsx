import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  ADMIN_SESSION,
  installBuilderScreenTestLifecycle,
  mockGetSupabaseClient,
  mockSignInAdmin,
} from "../testing/builderScreenFixture";
import { useDivinityBranchBuilderController } from "../hooks/useDivinityBranchBuilderController";

installBuilderScreenTestLifecycle();

describe("useDivinityBranchBuilderController", () => {
  it("exposes grouped auth, editor, status and action boundaries", () => {
    const { result } = renderHook(() =>
      useDivinityBranchBuilderController({
        initialAdminSession: null,
        initialMode: "create",
      }),
    );

    expect(result.current.auth).toMatchObject({
      isChecked: true,
      isPending: false,
      session: null,
    });
    expect(result.current.editor.selectedBranches).toEqual({
      center: null,
      left: null,
      right: null,
    });
    expect(result.current.status.pendingValidationTarget).toBeNull();
    expect(typeof result.current.actions.saveCurrentTab).toBe("function");
    expect(typeof result.current.confirmDiscardTransition).toBe("function");
  });

  it("owns sign-in state and refreshes the authenticated controller", async () => {
    mockGetSupabaseClient.mockReturnValue({});
    mockSignInAdmin.mockResolvedValue(ADMIN_SESSION);
    const { result } = renderHook(() =>
      useDivinityBranchBuilderController({
        initialAdminSession: null,
        initialMode: "create",
      }),
    );

    await act(async () => {
      await result.current.auth.signIn({
        email: "admin@example.com",
        password: "secret",
      });
    });

    await waitFor(() => {
      expect(result.current.auth.session).toEqual(ADMIN_SESSION);
    });
    expect(result.current.status.toast).toEqual({
      kind: "success",
      message: "Вход выполнен.",
    });
  });

  it("owns validation navigation until the screen acknowledges it", async () => {
    const { result } = renderHook(() =>
      useDivinityBranchBuilderController({
        initialAdminSession: ADMIN_SESSION,
        initialMode: "create",
      }),
    );

    await act(async () => {
      await result.current.actions.saveCurrentTab();
    });

    expect(result.current.status.pendingValidationTarget).toBe("hero");

    act(() => {
      result.current.actions.acknowledgeValidationTarget();
    });

    expect(result.current.status.pendingValidationTarget).toBeNull();
  });
});
