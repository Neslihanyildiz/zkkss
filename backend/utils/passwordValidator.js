/**
 * Password strength rules (used by backend for enforcement).
 * Keep in sync with frontend-nextjs/src/lib/passwordStrength.ts
 */

const RULES = [
    { id: 'length',    label: 'At least 8 characters',      test: (p) => p.length >= 8         },
    { id: 'upper',     label: 'At least one uppercase letter', test: (p) => /[A-Z]/.test(p)      },
    { id: 'lower',     label: 'At least one lowercase letter', test: (p) => /[a-z]/.test(p)      },
    { id: 'number',    label: 'At least one number',          test: (p) => /[0-9]/.test(p)      },
    { id: 'special',   label: 'At least one special character (!@#$%^&*…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/**
 * Returns an array of unmet rule labels.
 * An empty array means the password is valid.
 */
function validatePassword(password) {
    return RULES
        .filter((r) => !r.test(password))
        .map((r) => r.label);
}

module.exports = { validatePassword, RULES };
