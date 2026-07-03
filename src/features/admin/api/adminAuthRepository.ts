export type AdminSession = {
  email: string | null;
};

type AuthResult<T> = {
  data?: T;
  error: { message: string } | null;
};

type AdminAuthClient = {
  auth: {
    getSession?: () => Promise<
      AuthResult<{ session: { user: { email?: string | null } } | null }>
    >;
    signInWithPassword?: (credentials: {
      email: string;
      password: string;
    }) => Promise<AuthResult<{ user: { email?: string | null } | null }>>;
    signOut?: () => Promise<AuthResult<unknown>>;
  };
};

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

  return { email: data?.user?.email ?? null };
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

  const user = data?.session?.user;

  return user ? { email: user.email ?? null } : null;
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
