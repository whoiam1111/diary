import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import crypto from 'crypto';

export async function GET() {
    const user = await getSessionUser();
    if (!user || user.role !== 'coach') {
        return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
    }

    const res = await query(
        `SELECT c.id, c.code, c.is_used, c.created_at, c.used_at, u.name as used_by_name 
     FROM invite_codes c 
     LEFT JOIN users u ON c.used_by = u.id 
     ORDER BY c.created_at DESC`,
    );
    return NextResponse.json({ codes: res.rows });
}

export async function POST() {
    const user = await getSessionUser();
    if (!user || user.role !== 'coach') {
        return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
    }

    // 예: MIND-8F2B 고유 코드 생성
    const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
    const code = `MIND-${randomStr}`;

    await query('INSERT INTO invite_codes (code, created_by) VALUES ($1, $2)', [code, user.userId]);

    return NextResponse.json({ success: true, code });
}
