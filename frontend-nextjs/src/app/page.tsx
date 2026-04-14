"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, User, Eye, EyeOff, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { generateRSAKeyPair, exportKey } from "@/lib/rsa";
import { storePrivateKey } from "@/lib/keyStorage";
import { checkPasswordStrength, isPasswordValid, PASSWORD_RULES } from "@/lib/passwordStrength";

type Mode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = checkPasswordStrength(password);
  const canSubmit = mode === "login" || isPasswordValid(password);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (mode === "register" && !isPasswordValid(password)) {
      setError("Please meet all password requirements before registering.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        const keyPair = await generateRSAKeyPair();
        const publicKeyStr  = await exportKey(keyPair.publicKey);
        const privateKeyStr = await exportKey(keyPair.privateKey);

        const res = await api.register(username, password, publicKeyStr);
        if (res.error) throw new Error(res.error);

        // Store private key in IndexedDB with extractable: false
        await storePrivateKey(username, privateKeyStr);
        localStorage.setItem(`pub_${username}`, publicKeyStr);

        setMode("login");
        setError("");
        setPassword("");
      } else {
        const res = await api.login(username, password);

        localStorage.setItem("token", res.token);
        const userToStore = {
          id:         res.user.id,
          username:   res.user.username,
          public_key: res.user.public_key,
          role:       res.user.role,
        };
        localStorage.setItem("user", JSON.stringify(userToStore));
        if (res.user.public_key) {
          localStorage.setItem(`pub_${username}`, res.user.public_key);
        }
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Bar width per score (0–6 → 0–100%)
  const barWidth = strength.score === 0 ? 0 : Math.round((strength.score / 6) * 100);

  return (
    <div className="min-h-screen bg-gray-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-navy-900 mb-4 shadow-navy-md">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-navy-900">SecureShare</h1>
          <p className="text-navy-500 mt-1 text-sm">End-to-end encrypted file sharing</p>
        </div>

        <div className="card p-8">

          {/* Tab Toggle */}
          <div className="flex bg-navy-50 rounded-xl p-1 mb-8">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setPassword(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === m
                    ? "bg-navy-900 text-white shadow-navy-sm"
                    : "text-navy-500 hover:text-navy-700"
                }`}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-navy-700 mb-1.5">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                <input
                  className="input pl-10"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-navy-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                <input
                  className="input pl-10 pr-10"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "Create a strong password" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength — register mode only */}
              {mode === "register" && password.length > 0 && (
                <div className="mt-3 space-y-2">
                  {/* Strength bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-navy-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.barColor}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold ${strength.color}`}>
                      {strength.label}
                    </span>
                  </div>

                  {/* Rule checklist */}
                  <ul className="space-y-1">
                    {PASSWORD_RULES.map((rule) => {
                      const passed = strength.passedRules.includes(rule.id);
                      return (
                        <li key={rule.id} className="flex items-center gap-2 text-xs">
                          {passed
                            ? <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            : <X     className="w-3.5 h-3.5 text-red-400   flex-shrink-0" />}
                          <span className={passed ? "text-green-700" : "text-navy-500"}>
                            {rule.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Register info */}
            {mode === "register" && (
              <div className="px-4 py-3 rounded-xl bg-navy-50 border border-navy-200 text-navy-600 text-xs leading-relaxed">
                Your RSA private key is generated in-browser and stored with{" "}
                <code className="font-mono">extractable: false</code>. It never leaves this device.
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full py-3 bg-navy-900 text-white rounded-xl font-semibold text-sm hover:bg-navy-700 transition-colors shadow-navy-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? mode === "register" ? "Generating keys…" : "Signing in…"
                : mode === "register" ? "Create Account" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-navy-400 mt-6">
          All files are encrypted client-side before upload.
        </p>
      </div>
    </div>
  );
}
