// Wired backend: Controller -> Service -> Repository -> Database are all connected.

class Database {
  query(sql: string, params: unknown[]) {
    return [{ sql, params }];
  }
}

export class UserRepository {
  private db = new Database();
  findByEmail(email: string) {
    return this.db.query("SELECT * FROM users WHERE email = ?", [email]);
  }
}

export class AuthService {
  private userRepository = new UserRepository();
  login(email: string) {
    return this.userRepository.findByEmail(email);
  }
}

export class AuthController {
  private authService = new AuthService();
  login(email: string) {
    return this.authService.login(email);
  }
}
