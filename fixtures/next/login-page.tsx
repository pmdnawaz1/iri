import { loginUser } from "./api-login";

interface LoginPageProps {
  searchParams?: { redirect?: string };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  async function handleLogin(email: string, password: string) {
    const result = await loginUser(email, password);
    return result;
  }

  return {
    type: "page",
    title: "Login",
    redirect: searchParams?.redirect,
    onLogin: handleLogin,
  };
}
