import type { Handler } from "@netlify/functions";

// Standard synchronous function for health checks
export const handler: Handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate"
    },
    body: JSON.stringify({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "CareerAI",
      function: "netlify-function",
      region: process.env.AWS_REGION || "unknown"
    })
  };
};