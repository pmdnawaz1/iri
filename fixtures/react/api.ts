const BASE_URL = "/api";

export async function login(email: string): Promise<{ token: string } | null> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<{ token: string }>;
}

export async function logout(token: string): Promise<void> {
  await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
