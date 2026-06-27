export class AuthRepository {
    findUserByEmail(email: string) {
        return { id: 1, email };
    }
}

export class AuthService {
    private authRepository = new AuthRepository();
    
    login(email: string) {
        return this.authRepository.findUserByEmail(email);
    }
}

export class AuthController {
    private authService = new AuthService();
    
    login(req: any, res: any) {
        const user = this.authService.login(req.body.email);
        res.json({ token: "xyz" });
    }
}

export function setupAuthRoutes(app: any) {
    const authController = new AuthController();
    app.post("/login", (req: any, res: any) => {
        authController.login(req, res);
    });
}
