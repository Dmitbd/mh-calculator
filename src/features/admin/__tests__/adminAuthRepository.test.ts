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
          data: {
            user: {
              id: "admin-user-id",
              email: "admin@example.com",
              app_metadata: { role: "admin" },
            },
          },
          error: null,
        })),
      },
    };

    await expect(
      signInAdmin(client, {
        email: " admin@example.com ",
        password: "secret",
      }),
    ).resolves.toEqual({
      id: "admin-user-id",
      email: "admin@example.com",
      role: "admin",
    });

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "secret",
    });
  });

  it("signs a non-admin back out after a successful password login", async () => {
    const signOut = jest.fn(async () => ({ error: null }));
    const client = {
      auth: {
        signInWithPassword: jest.fn(async () => ({
          data: {
            user: {
              id: "regular-user-id",
              email: "user@example.com",
              app_metadata: { role: "user" },
            },
          },
          error: null,
        })),
        signOut,
      },
    };

    await expect(
      signInAdmin(client, {
        email: "user@example.com",
        password: "secret",
      }),
    ).rejects.toThrow("Недостаточно прав администратора.");

    expect(signOut).toHaveBeenCalledTimes(1);
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
          data: {
            session: {
              user: {
                id: "admin-user-id",
                email: "admin@example.com",
                app_metadata: { role: "admin" },
              },
            },
          },
          error: null,
        })),
      },
    };

    await expect(getCurrentAdminSession(client)).resolves.toEqual({
      id: "admin-user-id",
      email: "admin@example.com",
      role: "admin",
    });
  });

  it("treats a restored non-admin session as unauthenticated", async () => {
    const client = {
      auth: {
        getSession: jest.fn(async () => ({
          data: {
            session: {
              user: {
                id: "regular-user-id",
                email: "user@example.com",
                app_metadata: { role: "user" },
              },
            },
          },
          error: null,
        })),
      },
    };

    await expect(getCurrentAdminSession(client)).resolves.toBeNull();
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
