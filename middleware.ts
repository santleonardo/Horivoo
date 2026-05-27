import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Routes that are publicly accessible for GET requests (guest/students)
const PUBLIC_GET_ROUTES = [
  "/api/teachers",
  "/api/bookings",
  "/api/blocked-slots",
  "/api/coordinators",
  "/api/auth",
];

// Routes that allow POST without auth (student booking)
const PUBLIC_POST_ROUTES = ["/api/bookings"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res;
  }

  try {
    const { createServerClient } = await import("@supabase/ssr");

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isApiRoute = req.nextUrl.pathname.startsWith("/api/");

    if (isApiRoute && !user) {
      const isGet = req.method === "GET";
      const isPost = req.method === "POST";

      // Allow GET to public routes
      const isPublicGet =
        isGet &&
        PUBLIC_GET_ROUTES.some((route) =>
          req.nextUrl.pathname.startsWith(route)
        );

      // Allow POST to specific routes (student booking)
      const isPublicPost =
        isPost &&
        PUBLIC_POST_ROUTES.some((route) =>
          req.nextUrl.pathname === route
        );

      if (!isPublicGet && !isPublicPost) {
        return NextResponse.json(
          { error: "Não autenticado" },
          { status: 401 }
        );
      }
    }
  } catch (error) {
    console.error("[middleware] Supabase error:", error);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|icons|images|sw.js|workbox-*.js).*)",
  ],
};
