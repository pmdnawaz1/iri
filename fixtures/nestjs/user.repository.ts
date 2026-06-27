import { Injectable } from "@nestjs/common";

interface User {
  id: string;
  email: string;
}

@Injectable()
export class UserRepository {
  private readonly users: User[] = [
    { id: "1", email: "test@example.com" },
  ];

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find((u) => u.email === email);
  }

  async clearSession(userId: string): Promise<void> {
    // Session cleanup logic
    void userId;
  }
}
