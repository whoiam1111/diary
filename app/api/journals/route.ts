// app/api/journals/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date');
        const targetClientId = searchParams.get('clientId');

        if (!date) return NextResponse.json({ message: '날짜가 필요합니다.' }, { status: 400 });

        let targetUserId = user.userId;

        // 코치가 내담자의 일기를 조회하는 경우 검증
        if (targetClientId && targetClientId !== user.userId) {
            if (user.role !== 'coach') {
                return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
            }

            // 본인이 초대한 내담자가 맞는지 보안 체크
            const check = await query('SELECT 1 FROM invite_codes WHERE created_by = $1 AND used_by = $2', [
                user.userId,
                targetClientId,
            ]);

            if (check.rows.length === 0) {
                return NextResponse.json({ message: '담당 내담자가 아닙니다.' }, { status: 403 });
            }

            targetUserId = targetClientId;
        }

        const res = await query('SELECT content FROM journals WHERE user_id = $1 AND journal_date = $2', [
            targetUserId,
            date,
        ]);

        return NextResponse.json({ content: res.rows[0]?.content || null });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });

        const { date, content } = await req.json();

        // 일기 저장 (본인 계정에만 저장)
        await query(
            `INSERT INTO journals (user_id, journal_date, content, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, journal_date) 
       DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP`,
            [user.userId, date, JSON.stringify(content)],
        );

        return NextResponse.json({ success: true, message: '저장 완료' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
