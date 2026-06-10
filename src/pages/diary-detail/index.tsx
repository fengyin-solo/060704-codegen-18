import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Button, Slider } from '@tarojs/components';
import Taro, { useRouter, useDidShow, useDidHide } from '@tarojs/taro';
import classNames from 'classnames';
import styles from './index.module.scss';
import { useDiaryStore, useUserStore } from '@/stores';
import { useBgmPlayer } from '@/hooks/useBgmPlayer';
import { BGM_TRACKS, getBgmTrackById } from '@/config/bgm';
import { renderPipeline } from '@/engine/RenderPipeline';
import { globalTimeline } from '@/engine/Timeline';
import { pluginLoader } from '@/engine/PluginLoader';
import {
  STATE_NAMES,
  STATE_COLORS,
  STATE_ORDER,
  DiaryState,
  type Diary
} from '@/types';

const DiaryDetailPage: React.FC = () => {
  const router = useRouter();
  const diaryId = router.params.id as string;

  const diaryStore = useDiaryStore();
  const userStore = useUserStore();
  const bgmPlayer = useBgmPlayer();

  const [diary, setDiary] = useState<Diary | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showBgmEditor, setShowBgmEditor] = useState(false);
  const [editingBgm, setEditingBgm] = useState<string | null>(null);
  const [bgmNeedsInteraction, setBgmNeedsInteraction] = useState(false);
  const [bgmTriedAutoPlay, setBgmTriedAutoPlay] = useState(false);
  const [previewTime, setPreviewTime] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderInterval = useRef<number | null>(null);

  useEffect(() => {
    if (!diaryId) return;

    const loadDiary = () => {
      const d = diaryStore.getDiaryById(diaryId);
      if (d) {
        setDiary(d);
        setIsOwner(d.ownerId === userStore.currentUserId);
        setEditingBgm(d.bgm);
      } else {
        Taro.showToast({ title: '日记不存在', icon: 'error' });
        setTimeout(() => Taro.navigateBack(), 1000);
      }
    };

    loadDiary();

    const interval = setInterval(() => {
      const d = diaryStore.getDiaryById(diaryId);
      if (d && !d.frozen) {
        setDiary({ ...d });
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [diaryId, diaryStore, userStore.currentUserId]);

  const renderDiary = useCallback(() => {
    if (!canvasRef.current || !diary) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (diary.state === DiaryState.SCHEDULED) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      return;
    }

    try {
      const diaryType = pluginLoader.getDiaryType(diary.type);
      const decayRate = diaryType?.decayRate || 1;
      renderPipeline.render(diary, ctx, previewTime ?? undefined, decayRate);
    } catch (e) {
      console.error('[DiaryDetail] 渲染失败:', e);
    }
  }, [diary, previewTime]);

  useEffect(() => {
    renderDiary();

    renderInterval.current = window.setInterval(renderDiary, 500);

    return () => {
      if (renderInterval.current) {
        clearInterval(renderInterval.current);
      }
    };
  }, [renderDiary]);

  useEffect(() => {
    if (diary?.bgm && diary.isPublic && !bgmTriedAutoPlay) {
      setBgmTriedAutoPlay(true);
      bgmPlayer.play(diary.bgm).then((success) => {
        if (success) {
          setBgmNeedsInteraction(false);
        } else {
          setBgmNeedsInteraction(true);
        }
      }).catch(() => {
        setBgmNeedsInteraction(true);
      });
    } else if (diary?.bgm && diary.isPublic && bgmPlayer.playError && !bgmPlayer.isPlaying) {
      setBgmNeedsInteraction(true);
    }

    return () => {
      bgmPlayer.stop();
    };
  }, [diary?.bgm, diary?.isPublic, bgmPlayer.playError, bgmPlayer.isPlaying, bgmTriedAutoPlay]);

  useEffect(() => {
    if (bgmPlayer.playError && !bgmPlayer.isPlaying && diary?.bgm) {
      setBgmNeedsInteraction(true);
    }
  }, [bgmPlayer.playError, bgmPlayer.isPlaying, diary?.bgm]);

  useDidShow(() => {
    if (diary?.bgm && diary.isPublic && !bgmPlayer.isPlaying && !bgmNeedsInteraction) {
      bgmPlayer.play(diary.bgm).then((success) => {
        if (!success) {
          setBgmNeedsInteraction(true);
        }
      });
    }
  });

  useDidHide(() => {
    bgmPlayer.pause();
  });

  const stateProgress = diary
    ? (STATE_ORDER.indexOf(diary.state) / (STATE_ORDER.length - 1)) * 100
    : 0;

  const currentBgmTrack = diary?.bgm ? getBgmTrackById(diary.bgm) : null;
  const hasBgm = !!diary?.bgm;

  const goBack = () => {
    bgmPlayer.stop();
    Taro.navigateBack();
  };

  const toggleFreeze = () => {
    if (!diary || !isOwner) return;
    diaryStore.toggleFreeze(diary.id);
    setDiary(diaryStore.getDiaryById(diary.id) || null);
  };

  const rewindState = () => {
    if (!diary || !isOwner) return;
    diaryStore.rewindState(diary.id);
    setDiary(diaryStore.getDiaryById(diary.id) || null);
  };

  const updateBgm = (bgmId: string | null) => {
    if (!diary || !isOwner) return;
    diaryStore.updateDiary(diary.id, { bgm: bgmId });
    setDiary(diaryStore.getDiaryById(diary.id) || null);
  };

  const handleBgmInteraction = async () => {
    if (diary?.bgm) {
      bgmPlayer.clearPlayError();
      const success = await bgmPlayer.play(diary.bgm);
      if (success) {
        setBgmNeedsInteraction(false);
      } else {
        Taro.showToast({
          title: '请再次点击播放',
          icon: 'none',
          duration: 1500
        });
      }
    }
  };

  const handleBgmToggle = () => {
    if (bgmPlayer.isPlaying) {
      bgmPlayer.pause();
    } else {
      bgmPlayer.resume();
    }
  };

  const handleTimePreview = (value: number) => {
    setPreviewTime(value);
  };

  const handleTimePreviewEnd = () => {
    setPreviewTime(null);
  };

  const handleSaveBgm = () => {
    updateBgm(editingBgm);
    setShowBgmEditor(false);
  };

  const getStateColor = (state: DiaryState) => STATE_COLORS[state] || '#888';
  const getStateName = (state: DiaryState) => STATE_NAMES[state] || state;

  if (!diary) {
    return (
      <View className={styles.container}>
        <Text style={{ color: '#888', textAlign: 'center', display: 'block', padding: '100rpx 0' }}>
          加载中...
        </Text>
      </View>
    );
  }

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Button className={styles.backBtn} onClick={goBack}>← 返回</Button>

        {isOwner && (
          <View className={styles.actionBtns}>
            {diary.state !== DiaryState.DEAD && (
              <Button
                className={classNames(styles.actionBtn, styles.purple)}
                onClick={() => setShowBgmEditor(true)}
              >
                🎵 {hasBgm ? '编辑配乐' : '添加配乐'}
              </Button>
            )}
            {diary.state !== DiaryState.DEAD && diary.state !== DiaryState.SCHEDULED && (
              <Button
                className={classNames(styles.actionBtn, diary.frozen ? styles.frozen : styles.info)}
                onClick={toggleFreeze}
              >
                {diary.frozen ? '❄️ 已冻结' : '🥶 冻结'}
              </Button>
            )}
            {diary.state === DiaryState.DEAD && (
              <Button
                className={classNames(styles.actionBtn, styles.danger)}
                onClick={rewindState}
              >
                🔄 捞回
              </Button>
            )}
            {diary.state !== DiaryState.DEAD && diary.state !== DiaryState.SCHEDULED && (
              <Button
                className={classNames(styles.actionBtn, styles.warning)}
                onClick={rewindState}
              >
                ⏪ 回退
              </Button>
            )}
          </View>
        )}
      </View>

      <View className={styles.content}>
        <View className={styles.canvasSection}>
          <View className={styles.canvasWrapper} style={{ borderColor: getStateColor(diary.state) }}>
            <View className={styles.canvasContainer}>
              <canvas
                ref={canvasRef}
                className={styles.canvas}
                width={800}
                height={500}
              />
              
              {diary.state === DiaryState.SCHEDULED && (
                <View className={styles.scheduledOverlay}>
                  <Text className={styles.scheduledIcon}>⏰</Text>
                  <Text className={styles.scheduledText}>日记尚未发布</Text>
                </View>
              )}
            </View>
          </View>

          {isOwner && diary.state !== DiaryState.SCHEDULED && (
            <View className={styles.timePreview}>
              <Text className={styles.timeLabel}>
                {diary.state === DiaryState.DEAD
                  ? '时间回溯: 拖动滑块查看过去的状态'
                  : '时间预览: 拖动滑块查看过去或未来的状态'}
              </Text>
              <Slider
                className={styles.timeSlider}
                min={diary.createdAt - 200}
                max={diary.state === DiaryState.DEAD ? diary.createdAt + 1000 : diary.createdAt + 2000}
                value={previewTime ?? diary.createdAt}
                activeColor="#39ff14"
                backgroundColor="#333"
                blockSize={20}
                onChanging={(e) => handleTimePreview(e.detail.value)}
                onTouchEnd={handleTimePreviewEnd}
              />
              <View className={styles.timeHint}>
                <Text>过去</Text>
                <Text>{previewTime ? `预览时间: ${Math.floor(previewTime)}` : '当前时间'}</Text>
                <Text>{diary.state === DiaryState.DEAD ? '死亡时间' : '未来'}</Text>
              </View>
            </View>
          )}
        </View>

        <View className={styles.sidebar}>
          <View className={styles.infoCard}>
            <Text className={styles.diaryTitle}>{diary.title}</Text>

            <View style={{ marginBottom: '24rpx' }}>
              <Text
                className={styles.stateBadge}
                style={{ color: getStateColor(diary.state), borderColor: getStateColor(diary.state) }}
              >
                {getStateName(diary.state)}
              </Text>
              {diary.frozen && (
                <Text className={styles.frozenBadge}>❄️ 已冻结</Text>
              )}
            </View>

            <View className={styles.progressSection}>
              <View className={styles.progressLabel}>
                <Text>状态进度</Text>
                <Text>{Math.floor(stateProgress)}%</Text>
              </View>
              <View className={styles.progressBar}>
                <View
                  className={styles.progressFill}
                  style={{ width: `${stateProgress}%`, backgroundColor: getStateColor(diary.state) }}
                />
              </View>
              <View className={styles.progressDots}>
                {STATE_ORDER.map(state => (
                  <Text
                    key={state}
                    className={styles.progressDot}
                    style={{
                      color: STATE_ORDER.indexOf(state) <= STATE_ORDER.indexOf(diary.state)
                        ? getStateColor(state)
                        : '#666'
                    }}
                  >
                    ●
                  </Text>
                ))}
              </View>
            </View>

            <View className={styles.metaList}>
              {!isOwner && (
                <View className={styles.metaItem}>
                  <Text className={styles.metaLabel}>作者:</Text>
                  <Text className={styles.metaValue}>
                    👤 {userStore.getUserById(diary.ownerId)?.name || '匿名作者'}
                  </Text>
                </View>
              )}
              <View className={styles.metaItem}>
                <Text className={styles.metaLabel}>类型:</Text>
                <Text className={styles.metaValue}>
                  {pluginLoader.getDiaryType(diary.type)?.name || '未知'}
                </Text>
              </View>
              <View className={styles.metaItem}>
                <Text className={styles.metaLabel}>衰变率:</Text>
                <Text className={styles.metaValue}>
                  x{pluginLoader.getDiaryType(diary.type)?.decayRate || 1}
                </Text>
              </View>
              <View className={styles.metaItem}>
                <Text className={styles.metaLabel}>创建时间:</Text>
                <Text className={styles.metaValue}>{Math.floor(diary.createdAt)}</Text>
              </View>
            </View>
          </View>

          {hasBgm && (
            <View className={styles.bgmCard}>
              <View className={styles.bgmHeader}>
                <Text className={styles.bgmTitle}>🎵 日记配乐</Text>
                <Text className={styles.bgmStatus}>
                  {bgmPlayer.isPlaying ? '播放中' : '已暂停'}
                </Text>
              </View>

              {currentBgmTrack && (
                <View className={styles.bgmInfo}>
                  <Text className={styles.bgmIcon}>{currentBgmTrack.icon}</Text>
                  <View>
                    <Text className={styles.bgmName}>{currentBgmTrack.name}</Text>
                    <Text className={styles.bgmMood}>{currentBgmTrack.mood}</Text>
                  </View>
                </View>
              )}

              {(bgmNeedsInteraction || bgmPlayer.playError) && hasBgm ? (
                <View className={styles.bgmInteraction}>
                  <Button className={styles.playBtn} onClick={handleBgmInteraction}>
                    ▶ 点击播放氛围音乐
                  </Button>
                  <Text className={styles.bgmHintTitle}>🎵 这篇日记配有背景氛围音乐</Text>
                  <Text className={styles.bgmHint}>
                    由于小程序限制，需要您手动点击才能播放。{'\n'}
                    点击后将自动循环播放，为您营造数字腐朽的沉浸式氛围。
                  </Text>
                </View>
              ) : (
                <View className={styles.bgmControls}>
                  <Button
                    className={classNames(styles.controlBtn, styles.play)}
                    onClick={handleBgmToggle}
                  >
                    {bgmPlayer.isPlaying ? '⏸' : '▶'}
                  </Button>
                  <Button
                    className={classNames(
                      styles.controlBtn,
                      bgmPlayer.isMuted ? styles.muted : styles.mute
                    )}
                    onClick={bgmPlayer.toggleMute}
                  >
                    {bgmPlayer.isMuted ? '🔇' : '🔊'}
                  </Button>
                  <Slider
                    className={styles.volumeSlider}
                    min={0}
                    max={1}
                    step={0.05}
                    value={bgmPlayer.volume}
                    activeColor="#a855f7"
                    backgroundColor="#333"
                    blockSize={16}
                    onChanging={(e) => bgmPlayer.setVolume(e.detail.value)}
                  />
                </View>
              )}
            </View>
          )}

          <View className={styles.pipelineCard}>
            <Text className={styles.pipelineTitle}>
              🧪 渲染管线 ({diary.pipeline.filter(p => p.enabled).length})
            </Text>

            {diary.pipeline.length === 0 ? (
              <Text className={styles.emptyPipeline}>没有应用任何烂法</Text>
            ) : (
              [...diary.pipeline]
                .sort((a, b) => a.order - b.order)
                .map((step, index) => (
                  <View
                    key={step.methodId}
                    className={classNames(styles.pipelineItem, {
                      [styles.disabled]: !step.enabled
                    })}
                  >
                    <Text className={styles.pipelineIndex}>{index + 1}</Text>
                    <Text className={styles.pipelineName}>
                      {pluginLoader.getDecayMethods().get(step.methodId)?.name || step.methodId}
                    </Text>
                    <View
                      className={classNames(styles.pipelineStatus, {
                        [styles.enabled]: step.enabled
                      })}
                    />
                  </View>
                ))
            )}
          </View>
        </View>
      </View>

      {showBgmEditor && (
        <View className={styles.modalOverlay} onClick={() => setShowBgmEditor(false)}>
          <View
            className={styles.modalContent}
            style={{ borderColor: '#a855f7' }}
            onClick={(e) => e.stopPropagation()}
          >
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle} style={{ color: '#a855f7' }}>
                🎵 日记配乐
              </Text>
              <Button className={styles.closeBtn} onClick={() => setShowBgmEditor(false)}>✕</Button>
            </View>

            <Text style={{ fontSize: '24rpx', color: '#888', marginBottom: '32rpx' }}>
              为公开日记绑定背景音效，访客查看时将一起播放，营造氛围感。仅对公开日记生效。
            </Text>

            <Button
              className={classNames(styles.noBgmOption, {
                [styles.active]: editingBgm === null
              })}
              onClick={() => setEditingBgm(null)}
            >
              🔇 不配乐
            </Button>

            <View className={styles.bgmGrid}>
              {BGM_TRACKS.map(track => (
                <Button
                  key={track.id}
                  className={classNames(styles.bgmOption, {
                    [styles.active]: editingBgm === track.id
                  })}
                  onClick={() => setEditingBgm(track.id)}
                >
                  <View style={{ display: 'flex', alignItems: 'center', gap: '8rpx', marginBottom: '8rpx' }}>
                    <Text>{track.icon}</Text>
                    <Text>{track.name}</Text>
                  </View>
                  <Text style={{ fontSize: '20rpx', opacity: 0.6 }}>{track.mood}</Text>
                </Button>
              ))}
            </View>

            {editingBgm && (
              <View style={{
                marginTop: '32rpx',
                padding: '24rpx',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '12rpx',
                border: '2rpx solid #333'
              }}>
                <Text style={{ fontSize: '24rpx', color: '#a855f7', marginBottom: '8rpx' }}>
                  当前选择:
                </Text>
                <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx' }}>
                  <Text style={{ fontSize: '32rpx' }}>
                    {getBgmTrackById(editingBgm)?.icon}
                  </Text>
                  <Text style={{ fontSize: '28rpx', color: '#fff' }}>
                    {getBgmTrackById(editingBgm)?.name}
                  </Text>
                  <Text style={{ fontSize: '22rpx', color: '#888' }}>
                    {getBgmTrackById(editingBgm)?.mood}
                  </Text>
                </View>
              </View>
            )}

            <View className={styles.modalFooter}>
              <Button className={styles.cancelBtn} onClick={() => setShowBgmEditor(false)}>
                取消
              </Button>
              <Button className={styles.confirmBtn} onClick={handleSaveBgm}>
                💾 保存
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default DiaryDetailPage;
