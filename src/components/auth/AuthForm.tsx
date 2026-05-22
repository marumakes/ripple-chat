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
    <div
      className="flex min-h-full items-center justify-center bg-background px-4"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.55 0.22 3 / 0.1) 0%, transparent 65%)",
      }}
    >
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun size={16} className="text-muted-foreground" />
        ) : (
          <Moon size={16} className="text-muted-foreground" />
        )}
      </button>

      <div className="w-full max-w-xs">
        {/* Card */}
        <div className="bg-card border border-border/60 rounded-2xl px-8 py-10 shadow-sm space-y-7">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <img
              src="/raspberry-ripple.svg"
              alt="Ripple"
              className="w-12 h-12 rounded-2xl object-cover"
            />
            <div className="text-center">
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                {mode === "signin" ? "Welcome back" : "Create account"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "signin"
                  ? "Sign in to Ripple Chat"
                  : "Get started with Ripple Chat"}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoComplete="email"
              className="h-11 text-sm"
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
              className="h-11 text-sm"
            />

            {error && (
              <p className="text-xs text-destructive px-1">{error}</p>
            )}
            {success && (
              <p className="text-xs text-green-600 dark:text-green-400 px-1">
                {success}
              </p>
            )}

            <Button
              className="w-full h-11 text-sm font-semibold mt-1"
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
        </div>

        {/* Toggle mode — outside card, like Instagram */}
        <div className="mt-4 bg-card border border-border/60 rounded-2xl px-8 py-5 shadow-sm text-center">
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className="text-primary font-semibold hover:opacity-80 transition-opacity"
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
                  className="text-primary font-semibold hover:opacity-80 transition-opacity"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
