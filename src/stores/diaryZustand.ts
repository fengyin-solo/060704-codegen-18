import { create } from 'zustand';
import type { Diary, DiaryState, PipelineStep, DiarySchedule } from '@/types';
import { DiaryState as DS } from '@/types';
import { storage } from '@/utils/storage';
import { generateId } from '@/utils/id';
import { useUserStore } from './userZustand';

interface DiaryStoreState {
  diaries: Diary[];
  publicDiaries: Diary[];
  currentUserDiaries: Diary[];
  init: () => void;
  createDiary: (
    ownerId: string,
    type: string,
    title: string,
    text: string,
    pipeline?: PipelineStep[],
    schedule?: Partial<DiarySchedule>,
    bgm?: string | null
  ) => Diary;
  updateDiary: (diaryId: string, updates: Partial<Diary>) => void;
  getDiaryById: (diaryId: string) => Diary | undefined;
  getDecayLevel: (diary: Diary) => number;
  toggleFreeze: (diaryId: string) => void;
  rewindState: (diaryId: string) => void;
  updateBgm: (diaryId: string, bgm: string | null) => void;
}

const mockNow = Date.now();

const sampleDiaries: Diary[] = [
  {
    id: 'sample-1',
    ownerId: 'user-1',
    type: 'loveLetter',
    title: '第一封情书',
    content: { text: '亲爱的你，今天是我们相识的第100天。阳光洒在窗台上，像你微笑时的弧度。我想把这一刻永远保存下来，虽然我知道，时间会带走一切。但至少，在这数字的世界里，我们的故事曾经鲜活过。' },
    state: DS.FRESH,
    frozen: false,
    createdAt: mockNow - 50,
    stateTimestamps: {
      [DS.SCHEDULED]: 0,
      [DS.FRESH]: mockNow - 50,
      [DS.ROTTING]: 0,
      [DS.ROTTED]: 0,
      [DS.DYING]: 0,
      [DS.DEAD]: 0
    },
    pipeline: [],
    isPublic: true,
    schedule: { publishAt: null, decayStartAt: null, autoArchiveAt: null },
    decayStartTime: null,
    bgm: 'rain'
  },
  {
    id: 'sample-2',
    ownerId: 'user-2',
    type: 'nightmare',
    title: '噩梦记录',
    content: { text: '昨晚又做了那个梦。无尽的走廊，闪烁的灯光，墙上的文字在我靠近时变成乱码。我跑啊跑，却始终找不到出口。醒来时，枕头已经湿透。我为什么要记录这些？也许记录本身就是一种解脱。' },
    state: DS.ROTTING,
    frozen: false,
    createdAt: mockNow - 150,
    stateTimestamps: {
      [DS.SCHEDULED]: 0,
      [DS.FRESH]: mockNow - 150,
      [DS.ROTTING]: mockNow - 80,
      [DS.ROTTED]: 0,
      [DS.DYING]: 0,
      [DS.DEAD]: 0
    },
    pipeline: [],
    isPublic: true,
    schedule: { publishAt: null, decayStartAt: null, autoArchiveAt: null },
    decayStartTime: null,
    bgm: 'dark'
  },
  {
    id: 'sample-3',
    ownerId: 'user-1',
    type: 'base',
    title: '普通的一天',
    content: { text: '今天天气很好。早上喝了一杯咖啡，看了几页书。下午去公园散步，看到一只猫在晒太阳。没有什么特别的事情发生，但这样平静的日子，也许就是幸福吧。' },
    state: DS.FRESH,
    frozen: false,
    createdAt: mockNow - 30,
    stateTimestamps: {
      [DS.SCHEDULED]: 0,
      [DS.FRESH]: mockNow - 30,
      [DS.ROTTING]: 0,
      [DS.ROTTED]: 0,
      [DS.DYING]: 0,
      [DS.DEAD]: 0
    },
    pipeline: [],
    isPublic: true,
    schedule: { publishAt: null, decayStartAt: null, autoArchiveAt: null },
    decayStartTime: null,
    bgm: 'lofi'
  },
  {
    id: 'sample-4',
    ownerId: 'user-2',
    type: 'base',
    title: '时间旅行日志 #001',
    content: { text: '我是时间旅人，在时间轴上漫步。今天我访问了2025年的春天，那里的樱花开得很美。我试图记录下这一刻，但我知道，这些文字最终也会在时间的长河中腐烂。' },
    state: DS.FRESH,
    frozen: false,
    createdAt: mockNow - 200,
    stateTimestamps: {
      [DS.SCHEDULED]: 0,
      [DS.FRESH]: mockNow - 200,
      [DS.ROTTING]: 0,
      [DS.ROTTED]: 0,
      [DS.DYING]: 0,
      [DS.DEAD]: 0
    },
    pipeline: [],
    isPublic: true,
    schedule: { publishAt: null, decayStartAt: null, autoArchiveAt: null },
    decayStartTime: null,
    bgm: 'piano'
  }
];

export const useDiaryStore = create<DiaryStoreState>((set, get) => ({
  diaries: [],
  publicDiaries: [],
  currentUserDiaries: [],

  init: () => {
    const storedDiaries = storage.getDiaries();
    let diaries = storedDiaries.map(d => ({
      ...d,
      bgm: d.bgm ?? null
    }));
    
    if (diaries.length === 0) {
      diaries = sampleDiaries;
      storage.saveDiaries(diaries);
    }
    
    const userStore = useUserStore.getState();
    const userId = userStore.currentUserId || userStore.visitingUserId;
    
    set({
      diaries,
      publicDiaries: diaries.filter(d => d.isPublic && d.state !== DS.DEAD),
      currentUserDiaries: userId ? diaries.filter(d => d.ownerId === userId) : []
    });
  },

  createDiary: (
    ownerId: string,
    type: string,
    title: string,
    text: string,
    pipeline: PipelineStep[] = [],
    schedule: Partial<DiarySchedule> = {},
    bgm: string | null = null
  ): Diary => {
    const now = Date.now();
    
    const fullSchedule: DiarySchedule = {
      publishAt: schedule.publishAt ?? null,
      decayStartAt: schedule.decayStartAt ?? null,
      autoArchiveAt: schedule.autoArchiveAt ?? null
    };
    
    const initialState = fullSchedule.publishAt && fullSchedule.publishAt > now
      ? DS.SCHEDULED
      : DS.FRESH;
    
    const diary: Diary = {
      id: generateId(),
      ownerId,
      type,
      title,
      content: { text },
      state: initialState,
      frozen: false,
      createdAt: now,
      stateTimestamps: {
        [DS.SCHEDULED]: initialState === DS.SCHEDULED ? now : 0,
        [DS.FRESH]: initialState === DS.FRESH ? now : 0,
        [DS.ROTTING]: 0,
        [DS.ROTTED]: 0,
        [DS.DYING]: 0,
        [DS.DEAD]: 0
      },
      pipeline,
      isPublic: true,
      schedule: fullSchedule,
      decayStartTime: fullSchedule.decayStartAt,
      bgm
    };
    
    const diaries = [...get().diaries, diary];
    const userStore = useUserStore.getState();
    const userId = userStore.currentUserId || userStore.visitingUserId;
    
    set({
      diaries,
      publicDiaries: diaries.filter(d => d.isPublic && d.state !== DS.DEAD),
      currentUserDiaries: userId ? diaries.filter(d => d.ownerId === userId) : []
    });
    
    storage.saveDiaries(diaries);
    
    return diary;
  },

  updateDiary: (diaryId: string, updates: Partial<Diary>) => {
    const diaries = get().diaries.map(d => 
      d.id === diaryId ? { ...d, ...updates } : d
    );
    
    const userStore = useUserStore.getState();
    const userId = userStore.currentUserId || userStore.visitingUserId;
    
    set({
      diaries,
      publicDiaries: diaries.filter(d => d.isPublic && d.state !== DS.DEAD),
      currentUserDiaries: userId ? diaries.filter(d => d.ownerId === userId) : []
    });
    
    storage.saveDiaries(diaries);
  },

  getDiaryById: (diaryId: string) => {
    return get().diaries.find(d => d.id === diaryId);
  },

  getDecayLevel: (diary: Diary): number => {
    const elapsed = Date.now() - diary.createdAt;
    const maxElapsed = 1000;
    return Math.min(1, elapsed / maxElapsed);
  },

  toggleFreeze: (diaryId: string) => {
    const diary = get().getDiaryById(diaryId);
    if (diary) {
      get().updateDiary(diaryId, { frozen: !diary.frozen });
    }
  },

  rewindState: (diaryId: string) => {
    const diary = get().getDiaryById(diaryId);
    if (diary) {
      const newState = diary.state === DS.DEAD ? DS.DYING : 
                       diary.state === DS.DYING ? DS.ROTTED :
                       diary.state === DS.ROTTED ? DS.ROTTING :
                       diary.state === DS.ROTTING ? DS.FRESH : DS.FRESH;
      
      const now = Date.now();
      const newStateTimestamps = { ...diary.stateTimestamps };
      newStateTimestamps[newState] = now;
      
      get().updateDiary(diaryId, { 
        state: newState, 
        frozen: false,
        stateTimestamps: newStateTimestamps 
      });
    }
  },

  updateBgm: (diaryId: string, bgm: string | null) => {
    get().updateDiary(diaryId, { bgm });
  }
}));
