export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  avatar?: string;
  provider?: string;
  provider_id?: string;
  mfa_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}
