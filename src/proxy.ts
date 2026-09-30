import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";

import { routing } from "@/lib/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const handleI18n = createIntlMiddleware(routing);

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`.
 * Session refresh still lives in `lib/supabase/middleware.ts`.
 */
export async function proxy(request: NextRequest) {
  const response = handleI18n(request);
  return updateSession(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
