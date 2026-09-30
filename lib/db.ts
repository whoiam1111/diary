// lib/db.ts
import { Pool } from 'pg';

declare global {
    // 개발 및 서버리스 재실행 시 커넥션 누수 방지
    var cachedPool: Pool | undefined;
}

const pool =
    globalThis.cachedPool ||
    new Pool({
        connectionString: process.env.DATABASE_URL,
        // 클라우드 DB(Neon/Supabase) 연결을 위한 SSL 활성화
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
        max: 3, // 서버리스 인스턴스당 커넥션 최대 수 제한
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });

if (process.env.NODE_ENV !== 'production') {
    globalThis.cachedPool = pool;
}

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
