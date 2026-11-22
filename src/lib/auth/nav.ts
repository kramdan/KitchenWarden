import type { SignedInNav } from "../../views/layout.js";

// Menu data for pages shown to a signed-in user. Anonymous pages get no menu.
// Takes a plain object so views never receive res.locals.
export function siteNav(locals: Record<string, unknown>): SignedInNav | undefined {
  const { user, csrfToken } = locals;
  if (!user || typeof csrfToken !== "string") {
    return undefined;
  }
  return { csrfToken };
}
