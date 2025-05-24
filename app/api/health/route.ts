import { NextRequest, NextResponse } from 'next/server';

// Use Edge Runtime for minimal latency
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'CareerAI',
    edge: true
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json'
    }
  });
}