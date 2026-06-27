import { AuthController } from "./app";

export function register(router: any) {
  const authController = new AuthController();
  router.post("/login", (req: any, res: any) => {
    const result = authController.login(req.body.email);
    res.json(result);
  });
}
