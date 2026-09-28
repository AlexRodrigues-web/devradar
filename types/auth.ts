export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  plan: string;
  onboardingStatus: string | null;
};

export type AuthSession = {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
};

export type AuthResult = {
  user: AuthUser;
  session: AuthSession;
};
