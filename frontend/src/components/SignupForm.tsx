import React, { useState } from "react";

type Props = {
  onSignup: (token: string) => void;
  onSwitchToLogin: () => void;
};

export function SignupForm({ onSignup, onSwitchToLogin }: Props) {
  // 1) form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 2) handle submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // 3) validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // 4) validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || res.statusText);
      }

      const userData = await res.json();
      
      // 5) After successful signup, automatically log in
      const loginPayload = new URLSearchParams();
      loginPayload.append("username", email);
      loginPayload.append("password", password);

      const loginRes = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: loginPayload.toString(),
      });

      if (!loginRes.ok) {
        throw new Error("Signup successful but automatic login failed");
      }

      const loginData = await loginRes.json();
      onSignup(loginData.access_token);
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 300 }}>
      <h2>Sign Up</h2>
      {error && (
        <div style={{ color: "red", marginBottom: 8 }}>{error}</div>
      )}
      <div>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%" }}
            disabled={isLoading}
          />
        </label>
      </div>
      <div style={{ marginTop: 8 }}>
        <label>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%" }}
            disabled={isLoading}
            minLength={6}
          />
        </label>
      </div>
      <div style={{ marginTop: 8 }}>
        <label>
          Confirm Password
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: "100%" }}
            disabled={isLoading}
          />
        </label>
      </div>
      <button 
        type="submit" 
        style={{ marginTop: 12, width: "100%" }}
        disabled={isLoading}
      >
        {isLoading ? "Creating Account..." : "Sign Up"}
      </button>
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <button 
          type="button" 
          onClick={onSwitchToLogin}
          style={{ background: "none", border: "none", color: "blue", textDecoration: "underline", cursor: "pointer" }}
        >
          Already have an account? Log in
        </button>
      </div>
    </form>
  );
} 