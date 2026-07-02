import {
  getCurrentAdminSession,
  signInAdmin,
  signOutAdmin,
} from "../api/adminAuthRepository";

describe("adminAuthRepository", () => {
  it("signs in with email and password", async () => {
    const client = {
      auth: {
        signInWithPassword: jest.fn(async () => ({
          data: { user: { email: "admin@example.com" } },
          error: null,
        })),
      },
    };

    await expect(
      signInAdmin(client, {
        email: " admin@example.com ",
        password: "secret",
      }),
    ).resolves.toEqual({ email: "admin@example.com" });

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "secret",
    });
  });

  it("throws a readable sign-in error", async () => {
    const client = {
      auth: {
        signInWithPassword: jest.fn(async () => ({
          data: { user: null },
          error: { message: "Invalid login credentials" },
        })),
      },
    };

    await expect(
      signInAdmin(client, {
        email: "admin@example.com",
        password: "bad",
      }),
    ).rejects.toThrow("Invalid login credentials");
  });

  it("reads the current session user", async () => {
    const client = {
      auth: {
        getSession: jest.fn(async () => ({
          data: { session: { user: { email: "admin@example.com" } } },
          error: null,
        })),
      },
    };

    await expect(getCurrentAdminSession(client)).resolves.toEqual({
      email: "admin@example.com",
    });
  });

  it("signs out", async () => {
    const client = {
      auth: {
        signOut: jest.fn(async () => ({ error: null })),
      },
    };

    await signOutAdmin(client);

    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });
});
