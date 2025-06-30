import React, { useState } from "react";
import { LoginForm }     from "./components/LoginForm";
import { TypingArea }    from "./components/TypingArea";

export default function App() {
  // 1) hold the JWT here
  const [token, setToken] = useState<string|null>(null);

  // 2) if we don't have one yet, show the login form
  if (!token) {
    return <LoginForm onLogin={setToken} />;
  }

  // 3) once we do, render the typing area
  return <TypingArea token={token} />;
}
