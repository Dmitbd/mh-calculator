export type AdminSession = {
  id: string;
  email: string | null;
  role: "admin";
};

type AuthUser = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown>;
};

type AuthResult<T> = {
  data?: T;
  error: { message: string } | null;
};

type AdminAuthClient = {
  auth: {
    getSession?: () => Promise<
      AuthResult<{ session: { user: AuthUser } | null }>
    >;
    signInWithPassword?: (credentials: {
      email: string;
      password: string;
    }) => Promise<AuthResult<{ user: AuthUser | null }>>;
    signOut?: () => Promise<AuthResult<unknown>>;
  };
};

function getAdminSession(user: AuthUser | null | undefined): AdminSession | null {
  if (!user || user.app_metadata?.role !== "admin") {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    role: "admin",
  };
}

export async function signInAdmin(
  client: AdminAuthClient,
  credentials: { email: string; password: string },
): Promise<AdminSession> {
  if (!client.auth.signInWithPassword) {
    throw new Error("Supabase auth client is not available.");
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: credentials.email.trim(),
    password: credentials.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  const session = getAdminSession(data?.user);

  if (!session) {
    await signOutAdmin(client);
    throw new Error("Недостаточно прав администратора.");
  }

  return session;
}

export async function getCurrentAdminSession(
  client: AdminAuthClient,
): Promise<AdminSession | null> {
  if (!client.auth.getSession) {
    return null;
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return getAdminSession(data?.session?.user);
}

export async function signOutAdmin(client: AdminAuthClient): Promise<void> {
  if (!client.auth.signOut) {
    return;
  }

  const { error } = await client.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}
