export type AuthUser = {
  id: string;
  email: string | null;
};

export type AuthActionState = {
  status: "idle" | "error" | "success";
  formError?: string;
  fieldErrors?: Record<string, string>;
};

export const initialAuthState: AuthActionState = { status: "idle" };
