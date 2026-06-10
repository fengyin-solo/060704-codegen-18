import { useState, useEffect, useCallback, useRef } from 'react';
import Taro from '@tarojs/taro';
import { getBgmTrackById } from '@/config/bgm';

let audioContext: Taro.InnerAudioContext | null = null;

const currentBgmIdRef = { value: '' as string | null };
const isPlayingRef = { value: false };
const volumeRef = { value: 0.4 };
const isMutedRef = { value: false };
const playErrorRef = { value: false };
const listenersBoundRef = { value: false };
const pendingPlayCheckRef = { value: null as number | null };

function ensureAudioContext(): Taro.InnerAudioContext {
  if (!audioContext) {
    audioContext = Taro.createInnerAudioContext();
    audioContext.loop = true;
    audioContext.volume = volumeRef.value;
  }
  return audioContext;
}

export function useBgmPlayer() {
  const [currentBgmId, setCurrentBgmId] = useState<string | null>(currentBgmIdRef.value);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(volumeRef.value);
  const [isMuted, setIsMuted] = useState(isMutedRef.value);
  const [playError, setPlayError] = useState(playErrorRef.value);

  const syncState = useCallback(() => {
    setCurrentBgmId(currentBgmIdRef.value);
    setIsPlaying(isPlayingRef.value);
    setVolume(volumeRef.value);
    setIsMuted(isMutedRef.value);
    setPlayError(playErrorRef.value);
  }, []);

  const play = useCallback(async (bgmId: string): Promise<boolean> => {
    const track = getBgmTrackById(bgmId);
    if (!track) {
      playErrorRef.value = true;
      return false;
    }

    const ctx = ensureAudioContext();
    
    if (currentBgmIdRef.value === bgmId && isPlayingRef.value) {
      playErrorRef.value = false;
      return true;
    }

    if (pendingPlayCheckRef.value) {
      clearTimeout(pendingPlayCheckRef.value);
      pendingPlayCheckRef.value = null;
    }

    playErrorRef.value = false;
    currentBgmIdRef.value = bgmId;

    try {
      ctx.stop();
    } catch (e) {
      // ignore stop errors
    }

    ctx.src = track.src;
    ctx.volume = isMutedRef.value ? 0 : volumeRef.value;

    try {
      ctx.play();
    } catch (e) {
      console.error('[BGM] play() 调用异常:', e);
      playErrorRef.value = true;
      isPlayingRef.value = false;
      syncState();
      return false;
    }

    return new Promise<boolean>((resolve) => {
      pendingPlayCheckRef.value = window.setTimeout(() => {
        if (!isPlayingRef.value) {
          console.warn('[BGM] 播放超时，判定为需要用户交互');
          playErrorRef.value = true;
          isPlayingRef.value = false;
          syncState();
          resolve(false);
        } else {
          playErrorRef.value = false;
          resolve(true);
        }
        pendingPlayCheckRef.value = null;
      }, 800);
    });
  }, [syncState]);

  const stop = useCallback(() => {
    const ctx = audioContext;
    if (ctx) {
      ctx.stop();
    }
    currentBgmIdRef.value = null;
    isPlayingRef.value = false;
    syncState();
  }, [syncState]);

  const pause = useCallback(() => {
    const ctx = audioContext;
    if (ctx) {
      ctx.pause();
    }
    isPlayingRef.value = false;
    syncState();
  }, [syncState]);

  const resume = useCallback(async () => {
    const ctx = audioContext;
    if (ctx && currentBgmIdRef.value) {
      try {
        ctx.play();
        isPlayingRef.value = true;
        syncState();
      } catch (e) {
        console.error('[BGM] 恢复播放失败:', e);
        isPlayingRef.value = false;
        syncState();
      }
    }
  }, [syncState]);

  const setVolumeValue = useCallback((v: number) => {
    volumeRef.value = v;
    if (audioContext && !isMutedRef.value) {
      audioContext.volume = v;
    }
    syncState();
  }, [syncState]);

  const toggleMute = useCallback(() => {
    isMutedRef.value = !isMutedRef.value;
    if (audioContext) {
      audioContext.volume = isMutedRef.value ? 0 : volumeRef.value;
    }
    syncState();
  }, [syncState]);

  useEffect(() => {
    const ctx = ensureAudioContext();
    
    const onPlay = () => {
      isPlayingRef.value = true;
      playErrorRef.value = false;
      if (pendingPlayCheckRef.value) {
        clearTimeout(pendingPlayCheckRef.value);
        pendingPlayCheckRef.value = null;
      }
      syncState();
    };
    
    const onPause = () => {
      isPlayingRef.value = false;
      syncState();
    };
    
    const onStop = () => {
      isPlayingRef.value = false;
      syncState();
    };
    
    const onError = (e: any) => {
      console.error('[BGM] 音频错误:', e);
      isPlayingRef.value = false;
      playErrorRef.value = true;
      if (pendingPlayCheckRef.value) {
        clearTimeout(pendingPlayCheckRef.value);
        pendingPlayCheckRef.value = null;
      }
      syncState();
    };

    ctx.onPlay(onPlay);
    ctx.onPause(onPause);
    ctx.onStop(onStop);
    ctx.onError(onError);

    return () => {
      ctx.offPlay(onPlay);
      ctx.offPause(onPause);
      ctx.offStop(onStop);
      ctx.offError(onError);
    };
  }, [syncState]);

  const clearPlayError = useCallback(() => {
    playErrorRef.value = false;
    syncState();
  }, [syncState]);

  return {
    currentBgmId,
    isPlaying,
    volume,
    isMuted,
    playError,
    play,
    stop,
    pause,
    resume,
    setVolume: setVolumeValue,
    toggleMute,
    clearPlayError
  };
}
