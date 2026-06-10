import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/server/db';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return redirect('/signin');
    }

    // Get the account from NextAuth Account table
    const account = await db.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
    });

    if (account && account.access_token) {
      // Create or update CalendarAccount
      const existing = await db.calendarAccount.findFirst({
        where: { userId: session.user.id, provider: 'google' },
      });
      
      if (existing) {
        await db.calendarAccount.update({
          where: { id: existing.id },
          data: {
            accessToken: account.access_token,
            refreshToken: account.refresh_token || null,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            email: session.user.email || '',
          },
        });
      } else {
        await db.calendarAccount.create({
          data: {
            userId: session.user.id,
            provider: 'google',
            email: session.user.email || '',
            accessToken: account.access_token,
            refreshToken: account.refresh_token || null,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
          },
        });
      }
    }

    return redirect('/diy-planner');
  } catch (error) {
    console.error('Google callback error:', error);
    return redirect('/diy-planner');
  }
}
