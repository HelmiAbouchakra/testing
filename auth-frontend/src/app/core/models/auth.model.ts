export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface AuthResponse {
  user: any;
  token?: string;
  requires_mfa?: boolean;
  verification_code?: string; // Added for debugging purposes
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  password: string;
  password_confirmation: string;
  token: string;
}

export interface VerifyEmailRequest {
  id: string;
  hash: string;
}

export interface MfaSetupResponse {
  secret: string;
  qr_code: string;
  recovery_codes: string[];
}

export interface MfaVerifyRequest {
  code: string;
  remember?: boolean;
}

export interface MfaVerifyResponse {
  success: boolean;
  message?: string;
  user?: any;
}

export interface PasswordChangeRequest {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  loading: boolean;
  requiresMfa: boolean;
  error: string | null;
}