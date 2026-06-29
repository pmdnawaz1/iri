// NestJS-style decorator routing (TSPEC-A021). The adapter must read @Controller + @Post.
class Database {
  query(_sql: string): unknown {
    return {};
  }
}

class AuthService {
  private db = new Database();
  login(email: string): unknown {
    return this.db.query(`SELECT * FROM users WHERE email = '${email}'`);
  }
}

@Controller("auth")
export class AuthController {
  private service = new AuthService();

  @Post("login")
  login(body: { email: string }): unknown {
    return this.service.login(body.email);
  }
}
