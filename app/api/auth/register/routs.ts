import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    const client = await pool.connect();
    try {
        const { role = 'client', username, password, name, inviteCode, coachSecret } = await req.json();

        if (!username || !password || !name) {
            return NextResponse.json({ message: '모든 기본 항목을 입력해주세요.' }, { status: 400 });
        }

        // 아이디 중복 체크
        const userRes = await client.query('SELECT id FROM users WHERE username = $1', [username.trim()]);
        if (userRes.rows.length > 0) {
            return NextResponse.json({ message: '이미 존재하는 아이디입니다.' }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // ───────────────────────────────────────────
        // [1] 코치 가입 처리
        // ───────────────────────────────────────────
        if (role === 'coach') {
            const serverCoachSecret = process.env.COACH_SIGNUP_SECRET || 'coach_master_2026!';
            if (coachSecret?.trim() !== serverCoachSecret) {
                return NextResponse.json({ message: '코치 가입 인증키가 올바르지 않습니다.' }, { status: 403 });
            }

            await client.query('INSERT INTO users (username, password_hash, name, role) VALUES ($1, $2, $3, $4)', [
                username.trim(),
                passwordHash,
                name.trim(),
                'coach',
            ]);

            return NextResponse.json({ success: true, message: '코치 계정 가입이 완료되었습니다.' });
        }

        // ───────────────────────────────────────────
        // [2] 내담자 가입 처리 (초대 코드 필요)
        // ───────────────────────────────────────────
        if (!inviteCode) {
            return NextResponse.json({ message: '초대 코드를 입력해주세요.' }, { status: 400 });
        }

        await client.query('BEGIN');

        // 초대 코드 유효성 검사 (락 설정)
        const codeRes = await client.query('SELECT id, is_used FROM invite_codes WHERE code = $1 FOR UPDATE', [
            inviteCode.trim().toUpperCase(),
        ]);

        if (codeRes.rows.length === 0 || codeRes.rows[0].is_used) {
            await client.query('ROLLBACK');
            return NextResponse.json({ message: '유효하지 않거나 이미 사용된 초대 코드입니다.' }, { status: 400 });
        }

        const codeId = codeRes.rows[0].id;

        // 내담자 유저 생성
        const newUserRes = await client.query(
            'INSERT INTO users (username, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id',
            [username.trim(), passwordHash, name.trim(), 'client'],
        );
        const newUserId = newUserRes.rows[0].id;

        // 초대 코드 사용 처리
        await client.query(
            'UPDATE invite_codes SET is_used = TRUE, used_by = $1, used_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newUserId, codeId],
        );

        await client.query('COMMIT');
        return NextResponse.json({ success: true, message: '내담자 계정 가입이 완료되었습니다.' });
    } catch (error) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 });
    } finally {
        client.release();
    }
}
