# Google Calendar Integration Setup

This document describes how to set up Google Calendar integration for OneHub.

## Prerequisites

1. Google Cloud Project with Calendar API enabled
2. OAuth 2.0 credentials configured
3. Environment variables set

## Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)
   - Save the **Client ID** and **Client Secret**

## Environment Variables

Add the following to your `.env.local` file:

```env
# Google OAuth
GOOGLE_ID=your_google_client_id_here
GOOGLE_SECRET=your_google_client_secret_here

# NextAuth (required for OAuth)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

To generate a `NEXTAUTH_SECRET`, run:
```bash
openssl rand -base64 32
```

## OAuth Scopes

The integration requests the following scopes:
- `openid` - Basic authentication
- `email` - User email address
- `profile` - User profile information
- `https://www.googleapis.com/auth/calendar` - Full calendar access
- `https://www.googleapis.com/auth/calendar.events` - Calendar events access

## Database Migration

After updating the Prisma schema, run:

```bash
cd apps/web
npx prisma migrate dev --name add_calendar_integration
npx prisma generate
```

## Usage

1. **Connect Google Calendar**: 
   - Navigate to the DIY Planner
   - Click the "Calendar" tab in the sidebar
   - Click "Connect Google Calendar"
   - Authorize the application

2. **Sync OneHub Events**:
   - After connecting, click "Sync OneHub → Google"
   - All events, tasks, and milestones will be synced to a dedicated "OneHub" calendar in Google Calendar

3. **View Overlay**:
   - Toggle "Show Google events" to overlay your existing Google Calendar events
   - This helps you see OneHub events alongside your personal calendar

## Features

- **Automatic Token Refresh**: Tokens are automatically refreshed when expired
- **Dedicated Calendar**: Creates a "OneHub" calendar in Google Calendar
- **Two-Way Mapping**: Tracks which OneHub entities map to which Google Calendar events
- **Color Coding**: Events are color-coded by type (Event/Task/Milestone/Payment)

## Troubleshooting

### "Token expired and no refresh token available"
- Reconnect your Google account by going through the OAuth flow again
- Make sure `prompt: 'consent'` is set in the OAuth config to get a refresh token

### "Failed to create OneHub calendar"
- Check that the Calendar API is enabled
- Verify OAuth scopes include calendar write access

### Events not syncing
- Check browser console for errors
- Verify API routes are accessible
- Ensure database tables are created (run migrations)

