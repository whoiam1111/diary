import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-32-chars-minimum!');

export async function createSessionToken(payload: { userId: string; username: string; role: string; name: string }) {
    return await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('14d').sign(SECRET);
}

export async function getSessionUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, SECRET);
        return payload as { userId: string; username: string; role: string; name: string };
    } catch {
        return null;
    }
}
