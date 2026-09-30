export interface JournalEntry {
    date: string; // YYYY-MM-DD
    sleepHours: string;

    // 오늘의 시작 기분
    startMood: number; // 1 ~ 5
    startEnergy: number; // 1 ~ 5 (상태)
    startReason: string;

    // 오늘의 마감 기분
    endMood: number; // 1 ~ 5
    endPeace: number; // 1 ~ 5 (호흡/안정도)
    endReason: string;

    // 마음 성찰 6대 프롬프트
    song: string; // 오늘 생각난 노래
    phrase: string; // 자주 들었던 문구
    passedThought: string; // 오늘 먹고(잊고) 지나치려 한 생각
    dailyRoutine: string; // 오늘의 일상
    lingeringWord: string; // 가장 마음이 쓰였던 한 마디
    gratefulPerson: string; // 오늘 고마운 사람

    // 밤 기록
    treasuredNight: string; // 기억/간직하고픈 밤

    // 감사 & 칭찬 (각 5가지)
    gratitudes: string[]; // 나를 위해 감사한 일 5가지
    praises: string[]; // 오늘 하루, 나에게 해 준 칭찬 5가지

    // 다짐 & 기대
    selfEncouragement: string; // 스스로에게 해주고픈 말
    tomorrowExpectation: string; // 내일 기대되는 일

    // 만족도 스탬프
    dayRating: number; // 1 ~ 10
    lastSavedAt?: string;
}

export const INITIAL_JOURNAL: JournalEntry = {
    date: new Date().toISOString().split('T')[0],
    sleepHours: '',
    startMood: 3,
    startEnergy: 3,
    startReason: '',
    endMood: 3,
    endPeace: 3,
    endReason: '',
    song: '',
    phrase: '',
    passedThought: '',
    dailyRoutine: '',
    lingeringWord: '',
    gratefulPerson: '',
    treasuredNight: '',
    gratitudes: ['', '', '', '', ''],
    praises: ['', '', '', '', ''],
    selfEncouragement: '',
    tomorrowExpectation: '',
    dayRating: 0,
};
