export type UserId = string;

export type UserRole = "owner" | "member";

export type UserAccountStatus = "active" | "inactive" | "pending";

export type UserProfile = {
  id: UserId;
  name: string;
  email: string;
  role: UserRole;
  status: UserAccountStatus;
  createdAt: string;
  updatedAt?: string;
};

export type UserPreferences = {
  language: "pt" | "en" | "es";
  defaultLocation: string;
  defaultWorkMode: "any" | "remote" | "hybrid" | "onsite";
  alertsEnabled: boolean;
};