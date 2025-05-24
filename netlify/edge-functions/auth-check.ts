import type { Context } from "@netlify/edge-functions";

// Edge function for fast auth checks
export default async (request: Request, context: Context) => {
  // Get the session cookie
  const cookie = request.headers.get("cookie");
  
  if (!cookie || !cookie.includes("sb-")) {
    return new Response(JSON.stringify({
      authenticated: false,
      message: "No session found"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });
  }
  
  // Quick session validation (without database call)
  // In production, you'd validate the JWT token
  const sessionValid = cookie.includes("sb-access-token");
  
  return new Response(JSON.stringify({
    authenticated: sessionValid,
    timestamp: new Date().toISOString()
  }), {
    status: sessionValid ? 200 : 401,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=60"
    }
  });
};