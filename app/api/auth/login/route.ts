import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createSessionToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

        const res = await query('SELECT * FROM users WHERE username = $1', [username]);
        if (res.rows.length === 0) {
            return NextResponse.json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
        }

        const user = res.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return NextResponse.json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
        }

        // JWT 토큰 발급 및 쿠키 저장
        const token = await createSessionToken({
            userId: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
        });

        const cookieStore = await cookies();
        cookieStore.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 14, // 14일
        });

        return NextResponse.json({
            success: true,
            user: { id: user.id, username: user.username, name: user.name, role: user.role },
        });
    } catch {
        return NextResponse.json({ message: '로그인 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
