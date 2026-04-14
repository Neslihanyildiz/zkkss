// src/lib/passwordStrength.ts
// Keep in sync with backend/utils/passwordValidator.js

export interface PasswordRule {
  id: string;
  label: string;
  test: (p: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length",  label: "At least 8 characters",             test: (p) => p.length >= 8          },
  { id: "upper",   label: "At least one uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p)       },
  { id: "lower",   label: "At least one lowercase letter (a–z)", test: (p) => /[a-z]/.test(p)       },
  { id: "number",  label: "At least one number (0–9)",          test: (p) => /[0-9]/.test(p)        },
  { id: "special", label: "At least one special character (!@#$%…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export type StrengthLevel = "empty" | "weak" | "fair" | "strong" | "very-strong";

export interface PasswordStrengthResult {
  score: number;          // 0 – 6
  level: StrengthLevel;
  label: string;
  color: string;          // Tailwind text colour class
  barColor: string;       // Tailwind bg colour class
  passedRules: string[];  // rule IDs that pass
  failedRules: PasswordRule[];
}

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { score: 0, level: "empty", label: "", color: "", barColor: "", passedRules: [], failedRules: PASSWORD_RULES };
  }

  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;   // bonus for longer passwords
  PASSWORD_RULES.slice(1).forEach((r) => { if (r.test(password)) score++; });

  const passedRules = PASSWORD_RULES.filter((r) => r.test(password)).map((r) => r.id);
  const failedRules = PASSWORD_RULES.filter((r) => !r.test(password));

  let level: StrengthLevel;
  let label: string;
  let color: string;
  let barColor: string;

  if (score <= 2)      { level = "weak";        label = "Weak";        color = "text-red-600";    barColor = "bg-red-500";    }
  else if (score <= 3) { level = "fair";         label = "Fair";        color = "text-orange-500"; barColor = "bg-orange-400"; }
  else if (score <= 4) { level = "strong";       label = "Strong";      color = "text-yellow-600"; barColor = "bg-yellow-500"; }
  else                 { level = "very-strong";  label = "Very Strong"; color = "text-green-600";  barColor = "bg-green-500";  }

  return { score, level, label, color, barColor, passedRules, failedRules };
}

/** Returns true only when all 5 rules pass */
export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}
