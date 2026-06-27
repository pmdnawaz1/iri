import { authService } from "./auth-service";

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  userId: string;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResponse | null> {
  return authService.authenticate(email, password);
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as LoginRequest;
  const result = await loginUser(body.email, body.password);

  if (!result) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  return new Response(JSON.stringify(result), { status: 200 });
}

const authService = {
  async authenticate(
    email: string,
    password: string,
  ): Promise<LoginResponse | null> {
    void password;
    return { token: `tok-${email}`, userId: "1" };
  },
};
