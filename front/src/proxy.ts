import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Next.js 16 "proxy" (formerly middleware): negotiates the locale from
 * Accept-Language and redirects `/` → `/es` or `/en`.
 */
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals and any file with an extension (pdf, svg, …).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
