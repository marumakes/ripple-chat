import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sun, Moon } from "lucide-react";

type Mode = "signin" | "signup";

export function AuthForm() {
  const { signIn, signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUp(email, password);
        setSuccess("Account created — you can now sign in.");
        setMode("signin");
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-background px-4">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-5 right-5 w-10 h-10 rounded-xl flex items-center justify-center bg-card border border-border hover:bg-accent transition-colors"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun size={17} className="text-muted-foreground" />
        ) : (
          <Moon size={17} className="text-muted-foreground" />
        )}
      </button>

      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="2.5" fill="white" />
              <circle
                cx="7"
                cy="7"
                r="5"
                stroke="white"
                strokeWidth="1.2"
                fill="none"
                opacity="0.6"
              />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-base text-muted-foreground mt-1">
              {mode === "signin"
                ? "Sign in to Ripple Chat"
                : "Get started with Ripple Chat"}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoComplete="email"
            className="h-12 text-base"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            className="h-12 text-base"
          />

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-500">{success}</p>}

          <Button
            className="w-full h-12 text-base"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </Button>
        </div>

        {/* Toggle mode */}
        <p className="text-center text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>
              Don't have an account?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
