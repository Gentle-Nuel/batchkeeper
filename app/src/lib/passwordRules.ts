// Single source of truth for password requirements — used both for the live
// checklist (components/ui.tsx's PasswordRequirements) and the actual
// submit-time validation in SignUp/ChangePassword/ResetPassword, so the two
// can never drift out of sync with each other.
export interface PasswordRule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { id: "number", label: "Contains a number", test: (pw) => /\d/.test(pw) },
  { id: "symbol", label: "Contains a symbol", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function passwordMeetsAllRules(pw: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(pw));
}
