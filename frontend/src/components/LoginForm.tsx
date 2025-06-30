import React, { useState } from "react";

type Props = {
  onLogin: (token: string) => void;
};

export function LoginForm({ onLogin }: Props) {
  // 1) form state
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string|null>(null);

  // 2) handle submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();               // stop page reload
    setError(null);

    // 3) build form-encoded payload
    const payload = new URLSearchParams();
    payload.append("username", email);
    payload.append("password", password);

    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload.toString(),
      });

      if (!res.ok) {
        // show the server’s error message (or a generic one)
        const detail = await res.text();
        throw new Error(detail || res.statusText);
      }

      const data = await res.json();
      // 4) extract the JWT
      onLogin(data.access_token);
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 300 }}>
      <h2>Log in</h2>
      {error && (
        <div style={{ color: "red", marginBottom: 8 }}>{error}</div>
      )}
      <div>
        <label>
          Email
          <input
            type="email" required
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
      </div>
      <div style={{ marginTop: 8 }}>
        <label>
          Password
          <input
            type="password" required
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
      </div>
      <button type="submit" style={{ marginTop: 12, width: "100%" }}>
        Log In
      </button>
    </form>
  );
}
