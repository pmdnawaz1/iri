// AuthService exists but is never reached from the route handler.
// The login chain is broken because routes.ts does not call this service.

export class AuthService {
  private readonly sessionStore: Map<string, string> = new Map();

  login(email: string): { token: string } | null {
    if (!email) {
      return null;
    }
    const token = `token-${email}`;
    this.sessionStore.set(token, email);
    return { token };
  }

  logout(token: string): void {
    this.sessionStore.delete(token);
  }
}
