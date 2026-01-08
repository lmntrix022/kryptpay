import isStrongPassword from 'validator/lib/isStrongPassword';

export const PASSWORD_POLICY = {
  minLength: 12,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
};

export const PASSWORD_POLICY_MESSAGE =
  'Le mot de passe doit contenir au moins 12 caractères, dont une majuscule, une minuscule, un chiffre et un caractère spécial.';

export function isPasswordCompliant(password: string): boolean {
  return isStrongPassword(password, PASSWORD_POLICY);
}
