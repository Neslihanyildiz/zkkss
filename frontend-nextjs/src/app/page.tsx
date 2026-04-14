"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, User, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { generateRSAKeyPair, exportKey } from "@/lib/rsa";
import { storePrivateKey } from "@/lib/keyStorage";

type Mode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        // Generate RSA key pair (extractable: true so we can export the public key)
        const keyPair = await generateRSAKeyPair();
        const publicKeyStr  = await exportKey(keyPair.publicKey);
        const privateKeyStr = await exportKey(keyPair.privateKey);

        const res = await api.register(username, password, publicKeyStr);
        if (res.error) throw new Error(res.error);

        // Store private key in IndexedDB with extractable: false
        await storePrivateKey(username, privateKeyStr);
        // Store public key in localStorage (not sensitive — it's public)
        localStorage.setItem(`pub_${username}`, publicKeyStr);

        setMode("login");
        setError("");
        setPassword("");
      } else {
        const res = await api.login(username, password);

        // Persist JWT token (needed for all protected API calls)
        localStorage.setItem("token", res.token);

        // Store safe user fields — password is never in this response
        const userToStore = {
          id:         res.user.id,
          username:   res.user.username,
          public_key: res.user.public_key,
        };
        localStorage.setItem("user", JSON.stringify(userToStore));

        // Cache the public key for quick access during upload
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

  return (
    <div className="min-h-screen bg-gray-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-navy-900 mb-4 shadow-navy-md">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-navy-900">SecureShare</h1>
          <p className="text-navy-500 mt-1 text-sm">End-to-end encrypted file sharing</p>
        </div>

        {/* Card */}
        <div className="card p-8">

          {/* Tab Toggle */}
          <div className="flex bg-navy-50 rounded-xl p-1 mb-8">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-navy-700 mb-1.5">
                Username
              </label>
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
              <label className="block text-sm font-semibold text-navy-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                <input
                  className="input pl-10 pr-10"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
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
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Register notice */}
            {mode === "register" && (
              <div className="px-4 py-3 rounded-xl bg-navy-50 border border-navy-200 text-navy-600 text-xs leading-relaxed">
                A unique RSA key pair will be generated in your browser. Your private key is stored in IndexedDB with{" "}
                <code className="font-mono">extractable: false</code> — it cannot be exported or read by scripts.
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
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
