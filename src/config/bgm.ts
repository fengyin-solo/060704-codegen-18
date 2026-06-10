export interface BgmTrack {
  id: string
  name: string
  icon: string
  mood: string
  src: string
}

export const BGM_TRACKS: BgmTrack[] = [
  {
    id: 'rain',
    name: '夜雨',
    icon: '🌧️',
    mood: '安静 · 忧伤',
    src: 'https://cdn.pixabay.com/audio/2022/03/10/audio_8cb749d485.mp3'
  },
  {
    id: 'ocean',
    name: '海浪',
    icon: '🌊',
    mood: '辽阔 · 平静',
    src: 'https://cdn.pixabay.com/audio/2022/08/31/audio_4192627972.mp3'
  },
  {
    id: 'forest',
    name: '深林',
    icon: '🌲',
    mood: '神秘 · 安宁',
    src: 'https://cdn.pixabay.com/audio/2022/03/10/audio_8cb749d485.mp3'
  },
  {
    id: 'piano',
    name: '琴忆',
    icon: '🎹',
    mood: '温柔 · 怀念',
    src: 'https://cdn.pixabay.com/audio/2023/10/07/audio_4c3b0b04b1.mp3'
  },
  {
    id: 'wind',
    name: '风声',
    icon: '🍃',
    mood: '空旷 · 孤独',
    src: 'https://cdn.pixabay.com/audio/2022/08/31/audio_4192627972.mp3'
  },
  {
    id: 'fire',
    name: '炉火',
    icon: '🔥',
    mood: '温暖 · 惬意',
    src: 'https://cdn.pixabay.com/audio/2022/03/10/audio_8cb749d485.mp3'
  },
  {
    id: 'night',
    name: '虫鸣',
    icon: '🌙',
    mood: '夏夜 · 惬意',
    src: 'https://cdn.pixabay.com/audio/2022/08/31/audio_4192627972.mp3'
  },
  {
    id: 'city',
    name: '霓虹',
    icon: '🌃',
    mood: '都市 · 疏离',
    src: 'https://cdn.pixabay.com/audio/2023/10/07/audio_4c3b0b04b1.mp3'
  }
]

export function getBgmTrackById(id: string): BgmTrack | undefined {
  return BGM_TRACKS.find(t => t.id === id)
}
