import React, { useState } from "react";
import { LoginForm }     from "./components/LoginForm";
import { SignupForm }    from "./components/SignupForm";
import { TypingArea }    from "./components/TypingArea";

export default function App() {
  // 1) hold the JWT here
  const [token, setToken] = useState<string|null>(null);
  const [showSignup, setShowSignup] = useState(false);

  // 2) if we don't have one yet, show the login or signup form
  if (!token) {
    if (showSignup) {
      return (
        <SignupForm 
          onSignup={setToken} 
          onSwitchToLogin={() => setShowSignup(false)} 
        />
      );
    } else {
      return (
        <LoginForm 
          onLogin={setToken} 
          onSwitchToSignup={() => setShowSignup(true)} 
        />
      );
    }
  }

  // 3) once we do, render the typing area
  return <TypingArea token={token} />;
}
