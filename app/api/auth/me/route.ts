import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ user: null });
    return NextResponse.json({ user });
}

export async function DELETE() {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');
    return NextResponse.json({ success: true });
}
