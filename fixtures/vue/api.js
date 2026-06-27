const BASE_URL = "/api";

/**
 * Login a user by email and return a token.
 * @param {string} email
 * @returns {Promise<{ token: string } | null>}
 */
export async function login(email) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

/**
 * Logout the current user.
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function logout(token) {
  await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
