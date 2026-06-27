import { login } from "./api.js";

/**
 * useAuth composable — manages authentication state and actions.
 * @returns {{ doLogin: Function, token: string | null }}
 */
export function useAuth() {
  let token = null;

  async function doLogin(email) {
    const result = await login(email);
    if (result && result.token) {
      token = result.token;
    }
    return result;
  }

  function doLogout() {
    token = null;
  }

  return { doLogin, doLogout, getToken: () => token };
}
