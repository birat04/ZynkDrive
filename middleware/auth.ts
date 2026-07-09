import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Middleware for protecting authenticated routes
 * Redirects to login if session is not found
 */
export function authMiddleware(
  patterns: string[] = ["/(dashboard|settings|api/private).*"]
) {
  return async (request: NextRequest) => {
    const pathname = request.nextUrl.pathname;

    // Check if route needs authentication
    const needsAuth = patterns.some((pattern) => {
      const regex = new RegExp(pattern);
      return regex.test(pathname);
    });

    if (!needsAuth) {
      return NextResponse.next();
    }

    // Check for session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("appwrite-session");

    if (!sessionCookie?.value) {
      // Redirect to login
      const loginUrl = new URL("/auth/sign-in", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Session exists, continue
    return NextResponse.next();
  };
}

/**
 * Middleware for redirecting authenticated users away from auth pages
 */
export function redirectAuthenticatedMiddleware(
  patterns: string[] = ["/(auth).*", "/"]
) {
  return async (request: NextRequest) => {
    const pathname = request.nextUrl.pathname;

    // Check if route should redirect authenticated users
    const shouldRedirect = patterns.some((pattern) => {
      const regex = new RegExp(pattern);
      return regex.test(pathname);
    });

    if (!shouldRedirect) {
      return NextResponse.next();
    }

    // Check for session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("appwrite-session");

    if (sessionCookie?.value) {
      // User is authenticated, redirect to dashboard
      return NextResponse.redirect(new URL("/", request.url));
    }

    // No session, continue to auth page
    return NextResponse.next();
  };
}

/**
 * Middleware for adding security headers
 */
export function securityHeadersMiddleware(request: NextRequest) {
  const response = NextResponse.next();

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Enable XSS protection
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // Permissions policy (formerly Feature Policy)
  response.headers.set(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
  );

  return response;
}

/**
 * Middleware for rate limiting (basic in-memory implementation)
 * For production, use Redis or a specialized service like Upstash
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimitMiddleware(
  limit = 100,
  windowMs = 60 * 1000, // 1 minute
  keyGenerator = (req: NextRequest) => req.ip || "unknown"
) {
  return (request: NextRequest) => {
    const key = keyGenerator(request);
    const now = Date.now();

    let record = rateLimitStore.get(key);

    // Reset if window has passed
    if (!record || record.resetTime < now) {
      record = { count: 0, resetTime: now + windowMs };
      rateLimitStore.set(key, record);
    }

    record.count++;

    if (record.count > limit) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((record.resetTime - now) / 1000).toString(),
        },
      });
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", (limit - record.count).toString());
    response.headers.set("X-RateLimit-Reset", record.resetTime.toString());

    return response;
  };
}

/**
 * Middleware for logging requests (development only)
 */
export function loggingMiddleware(request: NextRequest) {
  const response = NextResponse.next();

  if (process.env.NODE_ENV === "development") {
    console.log(`[${new Date().toISOString()}] ${request.method} ${request.nextUrl.pathname}`);
  }

  return response;
}

/**
 * Middleware for CORS headers
 */
export function corsMiddleware(request: NextRequest) {
  const response = NextResponse.next();

  const allowedOrigins = (
    process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000"
  ).split(",");
  const origin = request.headers.get("origin");

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
  }

  return response;
}

/**
 * Middleware for handling OPTIONS requests (for CORS preflight)
 */
export function optionsMiddleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return corsMiddleware(request);
  }
  return NextResponse.next();
}

/**
 * Middleware for checking feature flags
 */
export function featureFlagMiddleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add feature flags to response headers for client-side access
  if (process.env.NEXT_PUBLIC_ENCRYPTION_ENABLED) {
    response.headers.set("X-Feature-Encryption", "true");
  }

  if (process.env.NEXT_PUBLIC_AI_FEATURES_ENABLED) {
    response.headers.set("X-Feature-AI", "true");
  }

  if (process.env.NEXT_PUBLIC_2FA_ENABLED) {
    response.headers.set("X-Feature-2FA", "true");
  }

  return response;
}
