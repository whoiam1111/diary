// lib/db.ts
import { Pool } from 'pg';

declare global {
    var cachedPool: Pool | undefined;
}

let connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || '';

// Neon DB 필수: sslmode=require 옵션 자동 보정
if (connectionString && !connectionString.includes('sslmode=')) {
    connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
}

const pool =
    globalThis.cachedPool ||
    new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false, // SSL 인증서 허용
        },
        max: 3,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });

if (process.env.NODE_ENV !== 'production') {
    globalThis.cachedPool = pool;
}

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
