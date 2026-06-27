// Broken backend: the Controller never calls the Service, so Service and
// Repository are unreachable from the route entrypoint.

export class UserRepository {
  findByEmail(email: string) {
    return { email };
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
  login(_email: string) {
    return { error: "not implemented" }; // <-- never calls this.authService
  }
}
