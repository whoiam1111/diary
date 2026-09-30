'use client';

import React, { useState, useEffect } from 'react';
import { JournalEntry, INITIAL_JOURNAL } from '@/types/journal';

export default function MindJournalApp() {
    const [user, setUser] = useState<{ userId: string; username: string; name: string; role: string } | null>(null);
    const [loading, setLoading] = useState(true);

    // 인증 상태 ('login' | 'register')
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    // 가입 유형 ('client' | 'coach')
    const [registerRole, setRegisterRole] = useState<'client' | 'coach'>('client');
    const [form, setForm] = useState({
        username: '',
        password: '',
        name: '',
        inviteCode: '',
        coachSecret: '',
    });
    const [authError, setAuthError] = useState('');

    // 저널 상태
    const todayStr = new Date().toISOString().split('T')[0];
    const [currentDate, setCurrentDate] = useState<string>(todayStr);
    const [journal, setJournal] = useState<JournalEntry>({ ...INITIAL_JOURNAL, date: todayStr });
    const [saveStatus, setSaveStatus] = useState<string>('저장됨');

    // 코치 초대 코드 모달
    const [showCoachModal, setShowCoachModal] = useState(false);
    const [codes, setCodes] = useState<any[]>([]);

    // 세션 확인
    useEffect(() => {
        fetch('/api/auth/me')
            .then((res) => res.json())
            .then((data) => {
                setUser(data.user);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // 날짜별 저널 로드
    useEffect(() => {
        if (!user) return;
        setSaveStatus('불러오는 중...');
        fetch(`/api/journals?date=${currentDate}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.content) {
                    setJournal(data.content);
                } else {
                    setJournal({ ...INITIAL_JOURNAL, date: currentDate });
                }
                setSaveStatus('동기화 완료');
            })
            .catch(() => setSaveStatus('로드 실패'));
    }, [currentDate, user]);

    // 저널 필드 업데이트
    const updateField = (field: keyof JournalEntry, value: any) => {
        setJournal((prev) => ({ ...prev, [field]: value }));
    };

    const handleListChange = (field: 'gratitudes' | 'praises', index: number, value: string) => {
        setJournal((prev) => {
            const arr = [...prev[field]];
            arr[index] = value;
            return { ...prev, [field]: arr };
        });
    };

    // 자동 DB 저장 (디바운스 800ms)
    useEffect(() => {
        if (!user || loading) return;
        setSaveStatus('저장 중...');
        const timer = setTimeout(() => {
            fetch('/api/journals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: currentDate, content: journal }),
            }).then(() => {
                const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                setSaveStatus(`DB 저장 완료 (${time})`);
            });
        }, 800);

        return () => clearTimeout(timer);
    }, [journal, currentDate, user, loading]);

    const changeDateBy = (days: number) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + days);
        setCurrentDate(d.toISOString().split('T')[0]);
    };

    // 로그인 & 회원가입 제출
    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';

        const payload =
            authMode === 'login'
                ? { username: form.username, password: form.password }
                : {
                      role: registerRole,
                      username: form.username,
                      password: form.password,
                      name: form.name,
                      inviteCode: form.inviteCode,
                      coachSecret: form.coachSecret,
                  };

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (!res.ok) {
            setAuthError(data.message || '인증 처리에 실패했습니다.');
            return;
        }

        if (authMode === 'register') {
            alert(`${registerRole === 'coach' ? '코치' : '내담자'} 회원가입이 완료되었습니다! 로그인해주세요.`);
            setAuthMode('login');
        } else {
            setUser(data.user);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/me', { method: 'DELETE' });
        setUser(null);
    };

    const fetchCodes = () => {
        fetch('/api/coach/invite-codes')
            .then((res) => res.json())
            .then((d) => setCodes(d.codes || []));
    };

    const generateCode = async () => {
        await fetch('/api/coach/invite-codes', { method: 'POST' });
        fetchCodes();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#ECEFE8] flex items-center justify-center text-xs text-[#405C50]">
                마인드 저널을 준비하고 있습니다...
            </div>
        );
    }

    // ===================== [1] 로그인 & 회원가입 UI =====================
    if (!user) {
        return (
            <main className="min-h-screen bg-[#ECEFE8] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#FAFBF9] border border-[#CFD8CD] rounded-3xl p-8 shadow-sm text-[#223930]">
                    <div className="w-12 h-12 bg-[#E1E9DD] text-[#2C4F41] rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl">
                        🌿
                    </div>
                    <h1 className="text-xl font-serif font-bold text-center text-[#1E362C]">
                        {authMode === 'login' ? '마인드 저널 로그인' : '신규 회원가입'}
                    </h1>
                    <p className="text-xs text-[#5E766B] text-center mt-1 mb-5">
                        {authMode === 'login'
                            ? '아이디와 비밀번호로 접속하세요.'
                            : '가입 유형을 선택하고 등록해주세요.'}
                    </p>

                    {/* 가입 시: 내담자 vs 코치 선택 탭 */}
                    {authMode === 'register' && (
                        <div className="flex bg-[#EBF1E8] p-1 rounded-xl mb-4 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => {
                                    setRegisterRole('client');
                                    setAuthError('');
                                }}
                                className={`flex-1 py-1.5 rounded-lg transition ${
                                    registerRole === 'client'
                                        ? 'bg-white text-[#2C4F41] shadow-xs'
                                        : 'text-[#698276] hover:text-[#2C4F41]'
                                }`}
                            >
                                내담자 가입
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRegisterRole('coach');
                                    setAuthError('');
                                }}
                                className={`flex-1 py-1.5 rounded-lg transition ${
                                    registerRole === 'coach'
                                        ? 'bg-[#985338] text-white shadow-xs'
                                        : 'text-[#698276] hover:text-[#985338]'
                                }`}
                            >
                                코치 가입
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                        {authMode === 'register' && (
                            <>
                                {/* 내담자: 초대 코드 입력 */}
                                {registerRole === 'client' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-[#405C50] mb-1">
                                            초대 코드
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="예: MIND-A1B2"
                                            value={form.inviteCode}
                                            onChange={(e) => setForm({ ...form, inviteCode: e.target.value })}
                                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#CCD8C8] bg-white outline-none focus:border-[#2C4F41]"
                                            required
                                        />
                                    </div>
                                )}

                                {/* 코치: 마스터 인증키 입력 */}
                                {registerRole === 'coach' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-[#985338] mb-1">
                                            코치 가입 인증키
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="코치 마스터 키를 입력하세요"
                                            value={form.coachSecret}
                                            onChange={(e) => setForm({ ...form, coachSecret: e.target.value })}
                                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E0D2CB] bg-white outline-none focus:border-[#985338]"
                                            required
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-[#405C50] mb-1">
                                        {registerRole === 'coach' ? '코치 이름' : '내담자 이름 (닉네임)'}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="이름 입력"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#CCD8C8] bg-white outline-none focus:border-[#2C4F41]"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-[#405C50] mb-1">아이디</label>
                            <input
                                type="text"
                                placeholder="아이디 입력"
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#CCD8C8] bg-white outline-none focus:border-[#2C4F41]"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[#405C50] mb-1">비밀번호</label>
                            <input
                                type="password"
                                placeholder="비밀번호 입력"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#CCD8C8] bg-white outline-none focus:border-[#2C4F41]"
                                required
                            />
                        </div>

                        {authError && (
                            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                                {authError}
                            </p>
                        )}

                        <button
                            type="submit"
                            className={`w-full py-2.5 text-white text-xs font-bold rounded-xl transition shadow-xs ${
                                authMode === 'register' && registerRole === 'coach'
                                    ? 'bg-[#985338] hover:bg-[#80422B]'
                                    : 'bg-[#2C4F41] hover:bg-[#1E372D]'
                            }`}
                        >
                            {authMode === 'login'
                                ? '로그인'
                                : `${registerRole === 'coach' ? '코치' : '내담자'} 회원가입 완료`}
                        </button>
                    </form>

                    <div className="mt-5 text-center">
                        <button
                            onClick={() => {
                                setAuthMode(authMode === 'login' ? 'register' : 'login');
                                setAuthError('');
                            }}
                            className="text-xs text-[#405C50] hover:underline"
                        >
                            {authMode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    // ===================== [2] 저널 메인 화면 =====================
    return (
        <main className="min-h-screen bg-[#ECEFE8] text-[#223930] py-6 px-3 sm:px-6 flex justify-center">
            <div className="w-full max-w-4xl space-y-4">
                {/* 상단 툴바 */}
                <header className="bg-white/80 backdrop-blur-sm border border-[#D5DDD2] rounded-2xl px-5 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span className="text-lg">📖</span>
                        <div>
                            <div className="text-xs font-serif font-bold text-[#1E362C]">
                                {user.name}님의 마인드 저널 ({user.role === 'coach' ? '코치' : '내담자'})
                            </div>
                            <div className="text-[11px] text-[#698276]">{saveStatus}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* 코치 전용: 코드 관리 */}
                        {user.role === 'coach' && (
                            <button
                                onClick={() => {
                                    setShowCoachModal(true);
                                    fetchCodes();
                                }}
                                className="text-xs px-3 py-1.5 rounded-xl bg-[#985338] text-white font-medium hover:bg-[#80422B] transition shadow-xs"
                            >
                                🔑 초대 코드 관리
                            </button>
                        )}

                        {/* 날짜 앞/뒤 이동 */}
                        <div className="flex items-center bg-[#F3F6F1] border border-[#CCD8C9] rounded-xl px-2 py-1">
                            <button
                                onClick={() => changeDateBy(-1)}
                                className="px-2 py-0.5 text-xs text-[#486658] hover:text-black font-bold"
                                title="어제"
                            >
                                ‹
                            </button>
                            <input
                                type="date"
                                value={currentDate}
                                onChange={(e) => setCurrentDate(e.target.value)}
                                className="bg-transparent text-xs text-[#20392F] font-mono outline-none px-1"
                            />
                            <button
                                onClick={() => changeDateBy(1)}
                                className="px-2 py-0.5 text-xs text-[#486658] hover:text-black font-bold"
                                title="내일"
                            >
                                ›
                            </button>
                        </div>

                        <button
                            onClick={() => setCurrentDate(todayStr)}
                            className="text-xs px-2.5 py-1.5 rounded-xl border border-[#CCD8C9] bg-white hover:bg-[#F2F6F0] text-[#335345]"
                        >
                            오늘
                        </button>

                        <button
                            onClick={handleLogout}
                            className="text-xs px-3 py-1.5 rounded-xl border border-[#CCD8C9] bg-white hover:bg-[#F2F6F0] text-[#335345]"
                        >
                            로그아웃
                        </button>
                    </div>
                </header>

                {/* 저널 본지 */}
                <div className="bg-[#FAFBF9] border border-[#D0DACE] rounded-3xl p-6 sm:p-9 shadow-md space-y-6">
                    {/* 헤더 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-[#DCE4DA] pb-3 gap-3">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-serif font-bold text-[#3E5C4E] w-16">날짜</span>
                            <span className="text-sm font-mono text-[#1E362D]">{currentDate}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-serif font-bold text-[#3E5C4E] w-16">수면 시간</span>
                            <input
                                type="text"
                                placeholder="예: 7시간 30분 / 깊은 잠"
                                value={journal.sleepHours}
                                onChange={(e) => updateField('sleepHours', e.target.value)}
                                className="flex-1 text-xs bg-transparent border-b border-[#CCD7C8] pb-0.5 outline-none focus:border-[#2C4F41]"
                            />
                        </div>
                    </div>

                    {/* 기분 2분할 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* 시작 기분 */}
                        <div className="border border-[#D4DDD1] rounded-2xl p-4 bg-[#F7F9F5] space-y-3">
                            <h3 className="text-xs font-serif font-bold text-[#2A493D] border-b border-[#DCE5D8] pb-1.5 flex items-center gap-1.5">
                                <span>🌅</span> 오늘의 시작 기분
                            </h3>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-[#4E6B5E]">기분 ({journal.startMood})</span>
                                <div className="flex gap-1.5">
                                    {[1, 2, 3, 4, 5].map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => updateField('startMood', v)}
                                            className={`w-6 h-6 rounded-full text-[11px] font-bold transition ${
                                                journal.startMood === v
                                                    ? 'bg-[#2C4F41] text-white shadow-xs'
                                                    : 'bg-white border border-[#CDD8CA] text-[#557164]'
                                            }`}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <span className="text-[#4E6B5E]">상태/에너지 ({journal.startEnergy})</span>
                                <div className="flex gap-1.5">
                                    {[1, 2, 3, 4, 5].map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => updateField('startEnergy', v)}
                                            className={`w-6 h-6 rounded-full text-[11px] font-bold transition ${
                                                journal.startEnergy === v
                                                    ? 'bg-[#2C4F41] text-white shadow-xs'
                                                    : 'bg-white border border-[#CDD8CA] text-[#557164]'
                                            }`}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-start gap-2 pt-1">
                                <span className="text-xs text-[#4E6B5E] whitespace-nowrap pt-1">이유 :</span>
                                <textarea
                                    rows={2}
                                    placeholder="오늘 시작 기분의 이유를 적어보세요"
                                    value={journal.startReason}
                                    onChange={(e) => updateField('startReason', e.target.value)}
                                    className="flex-1 text-xs p-2 rounded-xl bg-white border border-[#CCD8C9] outline-none focus:border-[#2C4F41] resize-none"
                                />
                            </div>
                        </div>

                        {/* 마감 기분 */}
                        <div className="border border-[#D4DDD1] rounded-2xl p-4 bg-[#F7F9F5] space-y-3">
                            <h3 className="text-xs font-serif font-bold text-[#2A493D] border-b border-[#DCE5D8] pb-1.5 flex items-center gap-1.5">
                                <span>🌙</span> 오늘의 마감 기분
                            </h3>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-[#4E6B5E]">기분 ({journal.endMood})</span>
                                <div className="flex gap-1.5">
                                    {[1, 2, 3, 4, 5].map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => updateField('endMood', v)}
                                            className={`w-6 h-6 rounded-full text-[11px] font-bold transition ${
                                                journal.endMood === v
                                                    ? 'bg-[#2C4F41] text-white shadow-xs'
                                                    : 'bg-white border border-[#CDD8CA] text-[#557164]'
                                            }`}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <span className="text-[#4E6B5E]">호흡/안정도 ({journal.endPeace})</span>
                                <div className="flex gap-1.5">
                                    {[1, 2, 3, 4, 5].map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => updateField('endPeace', v)}
                                            className={`w-6 h-6 rounded-full text-[11px] font-bold transition ${
                                                journal.endPeace === v
                                                    ? 'bg-[#2C4F41] text-white shadow-xs'
                                                    : 'bg-white border border-[#CDD8CA] text-[#557164]'
                                            }`}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-start gap-2 pt-1">
                                <span className="text-xs text-[#4E6B5E] whitespace-nowrap pt-1">이유 :</span>
                                <textarea
                                    rows={2}
                                    placeholder="하루를 마감하며 든 생각이나 이유"
                                    value={journal.endReason}
                                    onChange={(e) => updateField('endReason', e.target.value)}
                                    className="flex-1 text-xs p-2 rounded-xl bg-white border border-[#CCD8C9] outline-none focus:border-[#2C4F41] resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 6대 문답 */}
                    <div className="border-t border-b border-[#D8E1D5] py-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                        {[
                            { label: '오늘 생각난 노래', key: 'song' },
                            { label: '자주 들었던 문구', key: 'phrase' },
                            { label: '오늘 먹고 지나치려 한 생각', key: 'passedThought' },
                            { label: '오늘의 일상', key: 'dailyRoutine' },
                            { label: '가장 마음이 쓰였던 한 마디', key: 'lingeringWord' },
                            { label: '오늘 고마운 사람', key: 'gratefulPerson' },
                        ].map((item) => (
                            <div key={item.key} className="flex items-center gap-2">
                                <span className="text-xs font-serif font-bold text-[#345245] w-36 shrink-0">
                                    {item.label}
                                </span>
                                <input
                                    type="text"
                                    value={(journal as any)[item.key]}
                                    onChange={(e) => updateField(item.key as keyof JournalEntry, e.target.value)}
                                    className="flex-1 text-xs border-b border-[#D2DDD0] bg-transparent py-1 outline-none focus:border-[#2C4F41]"
                                />
                            </div>
                        ))}
                    </div>

                    {/* 기억 / 간직하고픈 밤 */}
                    <div className="space-y-1.5">
                        <span className="text-xs font-serif font-bold text-[#2A493D] block">
                            🌌 기억 / 간직하고픈 밤
                        </span>
                        <textarea
                            rows={3}
                            value={journal.treasuredNight}
                            onChange={(e) => updateField('treasuredNight', e.target.value)}
                            placeholder="오늘 밤, 조용히 마음에 품고 잠들고 싶은 장면이나 소중한 생각"
                            className="w-full text-xs p-3 rounded-2xl border border-[#CCD8C8] bg-white outline-none focus:border-[#2C4F41] resize-none leading-relaxed"
                        />
                    </div>

                    {/* 감사 5가지 vs 칭찬 5가지 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                        <div className="space-y-2">
                            <div className="text-xs font-serif font-bold text-[#2C4C3E] border-b border-[#D4DFD1] pb-1">
                                나를 위해 감사한 일
                            </div>
                            <div className="space-y-1.5">
                                {journal.gratitudes.map((val, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs font-serif text-[#557365] w-4 text-center">
                                            {idx + 1}.
                                        </span>
                                        <input
                                            type="text"
                                            value={val}
                                            onChange={(e) => handleListChange('gratitudes', idx, e.target.value)}
                                            placeholder={`감사 ${idx + 1}`}
                                            className="flex-1 text-xs border-b border-[#D7E2D5] bg-transparent py-0.5 outline-none focus:border-[#2C4F41]"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs font-serif font-bold text-[#9E5235] border-b border-[#E8D4CC] pb-1">
                                오늘 하루, 나에게 해 준 칭찬
                            </div>
                            <div className="space-y-1.5">
                                {journal.praises.map((val, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs font-serif text-[#A96347] w-4 text-center">
                                            {idx + 1}.
                                        </span>
                                        <input
                                            type="text"
                                            value={val}
                                            onChange={(e) => handleListChange('praises', idx, e.target.value)}
                                            placeholder={`칭찬 ${idx + 1}`}
                                            className="flex-1 text-xs border-b border-[#E8D4CC] bg-transparent py-0.5 outline-none focus:border-[#C26241]"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 스스로에게 해주고픈 말 & 내일 기대되는 일 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                        <div>
                            <span className="text-xs font-serif font-bold text-[#2A493D] block mb-1">
                                스스로에게 해주고픈 말
                            </span>
                            <textarea
                                rows={2}
                                value={journal.selfEncouragement}
                                onChange={(e) => updateField('selfEncouragement', e.target.value)}
                                placeholder="나에게 전하는 다정한 격려"
                                className="w-full text-xs p-2.5 rounded-xl border border-[#CCD8C8] bg-white outline-none focus:border-[#2C4F41] resize-none"
                            />
                        </div>
                        <div>
                            <span className="text-xs font-serif font-bold text-[#2A493D] block mb-1">
                                내일 기대되는 일
                            </span>
                            <textarea
                                rows={2}
                                value={journal.tomorrowExpectation}
                                onChange={(e) => updateField('tomorrowExpectation', e.target.value)}
                                placeholder="내일을 기다리게 만드는 작은 설렘"
                                className="w-full text-xs p-2.5 rounded-xl border border-[#CCD8C8] bg-white outline-none focus:border-[#2C4F41] resize-none"
                            />
                        </div>
                    </div>

                    {/* 하루 만족도 원형 스탬프 */}
                    <div className="pt-4 border-t border-[#D9E2D6] flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-serif font-bold text-[#2A493D]">오늘 하루 만족도</span>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                                    <button
                                        key={score}
                                        type="button"
                                        onClick={() => updateField('dayRating', score)}
                                        className={`w-6 h-6 rounded-full text-[11px] font-bold transition flex items-center justify-center ${
                                            journal.dayRating === score
                                                ? 'bg-[#C26241] text-white shadow-xs scale-105'
                                                : 'bg-white border border-[#CBD7C8] text-[#5A7568] hover:border-[#C26241]'
                                        }`}
                                    >
                                        {score}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="text-[11px] font-serif text-[#81998D]">by mindful coach</div>
                    </div>
                </div>

                {/* ===================== [3] 코치 전용 초대 코드 관리 모달 ===================== */}
                {showCoachModal && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                        <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                <h3 className="text-sm font-bold text-[#1E362C]">🔑 내담자 초대 코드 발급</h3>
                                <button
                                    onClick={() => setShowCoachModal(false)}
                                    className="text-gray-400 hover:text-black"
                                >
                                    ✕
                                </button>
                            </div>

                            <button
                                onClick={generateCode}
                                className="w-full py-2.5 bg-[#2C4F41] text-white text-xs font-bold rounded-xl hover:bg-[#1E372D] transition shadow-xs"
                            >
                                + 새 초대 코드 발급하기
                            </button>

                            <div className="max-h-60 overflow-y-auto space-y-2 pt-2">
                                {codes.length === 0 ? (
                                    <p className="text-xs text-center text-gray-400 py-4">생성된 코드가 없습니다.</p>
                                ) : (
                                    codes.map((c) => (
                                        <div
                                            key={c.id}
                                            className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-[#F4F7F2] border border-[#DEE6DD]"
                                        >
                                            <div>
                                                <span className="font-mono font-bold text-[#2C4F41]">{c.code}</span>
                                                <span className="text-[10px] text-gray-500 ml-2">
                                                    {c.is_used ? `사용됨 (${c.used_by_name || '내담자'})` : '미사용'}
                                                </span>
                                            </div>
                                            {!c.is_used && (
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(c.code);
                                                        alert(`초대 코드 [${c.code}] 복사 완료`);
                                                    }}
                                                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#CBD7CA] hover:bg-gray-50 font-medium"
                                                >
                                                    코드 복사
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
