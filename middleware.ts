import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Important: This middleware is used to handle CORS for the API routes
// It should be located in the root folder, not in the app folder

export function middleware(request: NextRequest) {
    const origin = request.headers.get('origin')
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': origin || '*',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400',
            },
        })
    }

    // Handle actual requests
    const response = NextResponse.next()
    
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    return response
}

export const config = {
    matcher: '/api/:path*',
}