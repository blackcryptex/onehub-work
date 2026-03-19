import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error") || url.searchParams.get("type") || "Unknown error";
  const errorDescription = url.searchParams.get("error_description") || "";
  
  // Return HTML error page instead of redirecting
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authentication Error - OneHub</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f8fafc;
            color: #1e293b;
          }
          .container {
            background: white;
            border-radius: 16px;
            padding: 2rem;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          h1 {
            color: #dc2626;
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0 0 1rem 0;
          }
          p {
            color: #64748b;
            font-size: 0.875rem;
            margin: 0 0 1.5rem 0;
          }
          .error-code {
            background: #f1f5f9;
            padding: 0.5rem;
            border-radius: 0.5rem;
            font-family: monospace;
            font-size: 0.75rem;
            color: #475569;
            margin-bottom: 1.5rem;
          }
          a {
            display: inline-block;
            background: #4f46e5;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
          }
          a:hover {
            background: #4338ca;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Authentication Error</h1>
          <p>
            ${error === "Configuration" ? "There's an issue with the authentication configuration. Please check your environment variables." : ""}
            ${error === "AccessDenied" ? "You don't have permission to access this." : ""}
            ${error === "Verification" ? "The verification token is invalid or has expired." : ""}
            ${error === "OAuthSignin" || error === "OAuthCallback" ? "There was an error with the OAuth provider." : ""}
            ${!["Configuration", "AccessDenied", "Verification", "OAuthSignin", "OAuthCallback"].includes(error) ? `An authentication error occurred.` : ""}
            ${errorDescription ? `<br><small style="color: #94a3b8;">${errorDescription}</small>` : ""}
          </p>
          <div class="error-code">Error Code: ${error}</div>
          <p style="font-size: 0.75rem; color: #64748b; margin-top: 1rem;">
            Common issues:
            <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
              <li>Check if you've run the seed script to create test users</li>
              <li>Verify DATABASE_URL is set correctly in .env</li>
              <li>Make sure NEXTAUTH_SECRET is set</li>
            </ul>
          </p>
          <a href="/signin">Try signing in again</a>
        </div>
      </body>
    </html>
  `;
  
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
    },
  });
}

