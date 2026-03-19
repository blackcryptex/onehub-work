import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return redirect('/signin');
    }

    // Get the account from NextAuth Account table
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
    });

    if (account && account.access_token) {
      // Create or update CalendarAccount
      const existing = await prisma.calendarAccount.findFirst({
        where: { userId: session.user.id, provider: 'google' },
      });
      
      if (existing) {
        await prisma.calendarAccount.update({
          where: { id: existing.id },
          data: {
            accessToken: account.access_token,
            refreshToken: account.refresh_token || null,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            email: session.user.email || '',
          },
        });
      } else {
        await prisma.calendarAccount.create({
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

