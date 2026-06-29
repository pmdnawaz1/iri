// A capability that requires auth (PROFILE.VIEW) exposed WITHOUT any auth guard —
// execution closure says CLOSED, but guard closure (GAPS-v2 V5) must flag it.
class Database {
  query(_sql: string): unknown {
    return {};
  }
}

class ProfileController {
  private db = new Database();
  view(userId: string): unknown {
    return this.db.query(`SELECT * FROM users WHERE id = '${userId}'`);
  }
}

export function register(router: any): void {
  const controller = new ProfileController();
  router.get("/profile", (req: any, res: any) => {
    res.json(controller.view(req.userId));
  });
}
