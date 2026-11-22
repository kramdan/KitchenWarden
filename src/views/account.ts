import type { User } from "../lib/db/schema.js";

export type AccountPageInput = {
  user: User;
  csrfToken: string;
  error?: string;
};

export function renderAccountPage(input: AccountPageInput): string {
  throw new Error("renderAccountPage is not implemented yet");
}
