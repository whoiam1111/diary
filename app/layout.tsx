import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: '마인드 저널 - 마음 돌봄 데일리 다이어리',
    description: '코치와 내담자를 위한 프라이빗 마인드 저널',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko">
            <body className="antialiased selection:bg-[#2E5446] selection:text-white">{children}</body>
        </html>
    );
}
