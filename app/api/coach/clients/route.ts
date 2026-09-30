// app/api/coach/clients/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
    const user = await getSessionUser();
    if (!user || user.role !== 'coach') {
        return NextResponse.json({ message: '코치 권한이 필요합니다.' }, { status: 403 });
    }

    // 본인이 발급한 초대 코드로 가입한 내담자 목록 조회
    const res = await query(
        `SELECT 
        u.id, 
        u.name, 
        u.username, 
        c.code as invite_code,
        c.used_at,
        COUNT(j.id)::int as journal_count,
        MAX(j.journal_date)::text as last_journal_date
     FROM invite_codes c
     JOIN users u ON c.used_by = u.id
     LEFT JOIN journals j ON u.id = j.user_id
     WHERE c.created_by = $1 AND c.is_used = TRUE
     GROUP BY u.id, u.name, u.username, c.code, c.used_at
     ORDER BY u.name ASC`,
        [user.userId],
    );

    return NextResponse.json({ clients: res.rows });
}
