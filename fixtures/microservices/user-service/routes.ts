export class UserRepository {
    saveUser(data: any) {
        return { id: 2, ...data };
    }
}

export class UserService {
    private userRepository = new UserRepository();
    
    register(data: any) {
        return this.userRepository.saveUser(data);
    }
}

export class UserController {
    private userService = new UserService();
    
    register(req: any, res: any) {
        const user = this.userService.register(req.body);
        res.json({ user });
    }
}

export function setupUserRoutes(app: any) {
    const userController = new UserController();
    app.post("/register", (req: any, res: any) => {
        userController.register(req, res);
    });
}
