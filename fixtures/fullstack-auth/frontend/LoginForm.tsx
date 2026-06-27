import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");

  async function handleLogin() {
    await fetch("/login", { method: "POST", body: JSON.stringify({ email }) });
  }

  return (
    <form onSubmit={handleLogin}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="submit">Sign in</button>
    </form>
  );
}
