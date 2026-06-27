// Wired backend: Controller -> Service -> Repository are all connected.

export class UserRepository {
  findByEmail(email: string) {
    return { email }; // pretend DB read
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
