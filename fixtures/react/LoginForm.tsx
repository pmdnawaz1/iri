import { login } from "./api";

interface LoginFormProps {
  onSuccess?: (token: string) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  async function handleSubmit(email: string) {
    const result = await login(email);
    if (result?.token && onSuccess) {
      onSuccess(result.token);
    }
  }

  return {
    type: "form",
    onSubmit: handleSubmit,
  };
}
