import { Injectable } from "@nestjs/common";
import { UserRepository } from "./user.repository";

@Injectable()
export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async login(email: string): Promise<{ token: string } | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }
    return { token: `token-${user.email}` };
  }

  async logout(userId: string): Promise<void> {
    await this.userRepository.clearSession(userId);
  }
}
