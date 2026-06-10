import { ref, watch, onUnmounted } from 'vue'
import { getBgmTrackById } from '@/config/bgm'

const currentBgmId = ref<string | null>(null)
const isPlaying = ref(false)
const volume = ref(0.4)
const isMuted = ref(false)

let audioEl: HTMLAudioElement | null = null

function ensureAudioEl(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio()
    audioEl.loop = true
    audioEl.volume = volume.value
  }
  return audioEl
}

export function useBgmPlayer() {
  async function play(bgmId: string) {
    const track = getBgmTrackById(bgmId)
    if (!track) return

    const el = ensureAudioEl()
    if (currentBgmId.value === bgmId && isPlaying.value) return

    el.pause()
    el.currentTime = 0
    el.src = track.src
    el.volume = isMuted.value ? 0 : volume.value

    try {
      await el.play()
      currentBgmId.value = bgmId
      isPlaying.value = true
    } catch {
      currentBgmId.value = bgmId
      isPlaying.value = false
    }
  }

  function stop() {
    const el = audioEl
    if (el) {
      el.pause()
      el.currentTime = 0
    }
    currentBgmId.value = null
    isPlaying.value = false
  }

  function pause() {
    const el = audioEl
    if (el) {
      el.pause()
    }
    isPlaying.value = false
  }

  async function resume() {
    const el = audioEl
    if (el && currentBgmId.value) {
      try {
        await el.play()
        isPlaying.value = true
      } catch {
        isPlaying.value = false
      }
    }
  }

  function setVolume(v: number) {
    volume.value = v
    if (audioEl && !isMuted.value) {
      audioEl.volume = v
    }
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
    if (audioEl) {
      audioEl.volume = isMuted.value ? 0 : volume.value
    }
  }

  onUnmounted(() => {
    stop()
  })

  return {
    currentBgmId,
    isPlaying,
    volume,
    isMuted,
    play,
    stop,
    pause,
    resume,
    setVolume,
    toggleMute
  }
}
