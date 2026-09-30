import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ message: '인증 필요' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    if (!date) return NextResponse.json({ message: '날짜가 필요합니다.' }, { status: 400 });

    const res = await query('SELECT content FROM journals WHERE user_id = $1 AND journal_date = $2', [
        user.userId,
        date,
    ]);

    return NextResponse.json({ content: res.rows[0]?.content || null });
}

export async function POST(req: Request) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ message: '인증 필요' }, { status: 401 });

    const { date, content } = await req.json();

    // PostgreSQL UPSERT (ON CONFLICT) 쿼리
    await query(
        `INSERT INTO journals (user_id, journal_date, content, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, journal_date) 
     DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP`,
        [user.userId, date, JSON.stringify(content)],
    );

    return NextResponse.json({ success: true });
}
