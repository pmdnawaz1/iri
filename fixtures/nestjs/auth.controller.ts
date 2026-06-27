import { Controller, Post, Body } from "@nestjs/common";
import { AuthService } from "./auth.service";

interface LoginDto {
  email: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() dto: LoginDto): Promise<{ token: string } | null> {
    return this.authService.login(dto.email);
  }

  @Post("logout")
  async logout(@Body() body: { userId: string }): Promise<{ success: boolean }> {
    await this.authService.logout(body.userId);
    return { success: true };
  }
}
