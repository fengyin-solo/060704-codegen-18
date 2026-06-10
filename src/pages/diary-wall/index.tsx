import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Button, Input, Textarea, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import classNames from 'classnames';
import styles from './index.module.scss';
import { useDiaryStore, useUserStore } from '@/stores';
import { useBgmPlayer } from '@/hooks/useBgmPlayer';
import { BGM_TRACKS, getBgmTrackById } from '@/config/bgm';
import { renderPipeline } from '@/engine/RenderPipeline';
import { globalTimeline } from '@/engine/Timeline';
import { pluginLoader } from '@/engine/PluginLoader';
import { STATE_NAMES, STATE_COLORS, DiaryState, type Diary, type PipelineStep } from '@/types';

const DiaryWallPage: React.FC = () => {
  const diaryStore = useDiaryStore();
  const userStore = useUserStore();
  const bgmPlayer = useBgmPlayer();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterState, setFilterState] = useState<DiaryState | 'all'>('all');
  const [showBgmPicker, setShowBgmPicker] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState('base');
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['blur', 'chroma']);
  const [selectedBgm, setSelectedBgm] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [diaryTypes, setDiaryTypes] = useState<[string, any][]>([]);
  const [decayMethods, setDecayMethods] = useState<[string, any][]>([]);

  const canvasRefs = useRef<Map<string, HTMLCanvasElement | null>>(new Map());
  const renderIntervals = useRef<Map<string, number | null>>(new Map());

  useEffect(() => {
    const init = async () => {
      await pluginLoader.loadAll();
      setDiaryTypes(Array.from(pluginLoader.getDiaryTypes().entries()));
      setDecayMethods(Array.from(pluginLoader.getDecayMethods().entries()));
      diaryStore.init();
    };
    init();
  }, []);

  const diaries = diaryStore.currentUserDiaries;

  const filteredDiaries = filterState === 'all'
    ? diaries
    : diaries.filter(d => d.state === filterState);

  const stateStats = {
    all: diaries.length,
    ...diaries.reduce((acc, d) => {
      acc[d.state] = (acc[d.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  const canCreate = !!userStore.currentUserId;

  const renderDiary = useCallback((diary: Diary, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (diary.state === DiaryState.SCHEDULED) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    try {
      const diaryType = pluginLoader.getDiaryType(diary.type);
      const decayRate = diaryType?.decayRate || 1;
      renderPipeline.render(diary, ctx, undefined, decayRate);
    } catch (e) {
      console.error('[DiaryWall] 渲染失败:', e);
    }
  }, []);

  const setupRenderLoop = useCallback((diaryId: string) => {
    if (renderIntervals.current.has(diaryId)) return;
    
    const interval = window.setInterval(() => {
      const diary = diaryStore.getDiaryById(diaryId);
      const canvas = canvasRefs.current.get(diaryId);
      if (diary && canvas && !diary.frozen) {
        renderDiary(diary, canvas);
      }
    }, 500);
    
    renderIntervals.current.set(diaryId, interval);
  }, [diaryStore, renderDiary]);

  useEffect(() => {
    filteredDiaries.forEach(diary => {
      const canvas = canvasRefs.current.get(diary.id);
      if (canvas) {
        renderDiary(diary, canvas);
        setupRenderLoop(diary.id);
      }
    });

    return () => {
      renderIntervals.current.forEach(interval => {
        if (interval) clearInterval(interval);
      });
      renderIntervals.current.clear();
    };
  }, [filteredDiaries, renderDiary, setupRenderLoop]);

  useDidShow(() => {
    filteredDiaries.forEach(diary => {
      const canvas = canvasRefs.current.get(diary.id);
      if (canvas) {
        renderDiary(diary, canvas);
      }
    });
  });

  usePullDownRefresh(() => {
    diaryStore.init();
    setTimeout(() => Taro.stopPullDownRefresh(), 500);
  });

  const handleCreate = () => {
    if (!title.trim() || !content.trim() || !userStore.currentUserId) return;

    setIsCreating(true);

    const pipeline: PipelineStep[] = selectedMethods.map((methodId, index) => {
      const methodEntry = decayMethods.find(([id]) => id === methodId);
      const method = methodEntry ? methodEntry[1] : null;
      if (!method) return null;

      const params: Record<string, number> = {};
      Object.entries(method.params).forEach(([key, def]) => {
        params[key] = (def as { default: number }).default;
      });

      return {
        methodId,
        enabled: true,
        params,
        order: index
      };
    }).filter(Boolean) as PipelineStep[];

    diaryStore.createDiary(
      userStore.currentUserId,
      selectedType,
      title.trim(),
      content.trim(),
      pipeline,
      {},
      selectedBgm
    );

    setTitle('');
    setContent('');
    setSelectedMethods(['blur', 'chroma']);
    setSelectedBgm(null);
    setShowCreateModal(false);
    setIsCreating(false);

    Taro.showToast({ title: '日记创建成功', icon: 'success' });
  };

  const toggleMethod = (methodId: string) => {
    setSelectedMethods(prev => {
      const index = prev.indexOf(methodId);
      if (index === -1) {
        return [...prev, methodId];
      } else {
        return prev.filter(m => m !== methodId);
      }
    });
  };

  const goToDetail = (diaryId: string) => {
    bgmPlayer.stop();
    Taro.navigateTo({ url: `/pages/diary-detail/index?id=${diaryId}` });
  };

  const getStateColor = (state: DiaryState) => STATE_COLORS[state] || '#888';
  const getStateName = (state: DiaryState) => STATE_NAMES[state] || state;

  const bgmTrack = (id: string) => getBgmTrackById(id);

  const canCreateDiary = title.trim() && content.trim();

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <View>
          <Text className={styles.title}>📝 日记墙</Text>
          <Text className={styles.subtitle}>每篇日记都有自己的生命周期</Text>
        </View>
        {canCreate && (
          <Button
            className={styles.createBtn}
            onClick={() => setShowCreateModal(true)}
          >
            ✏️ 写新日记
          </Button>
        )}
      </View>

      <ScrollView scrollX className={styles.filterBar}>
        {Object.entries(stateStats).map(([state, count]) => (
          <Button
            key={state}
            className={classNames(styles.filterBtn, {
              [styles.active]: filterState === state
            })}
            style={state !== 'all' ? {
              borderColor: filterState === state ? getStateColor(state as DiaryState) : undefined,
              color: filterState === state ? getStateColor(state as DiaryState) : undefined
            } : {}}
            onClick={() => setFilterState(state as any)}
          >
            {state === 'all' ? '全部' : getStateName(state as DiaryState)} ({count})
          </Button>
        ))}
      </ScrollView>

      <View className={styles.divider} />

      {filteredDiaries.length === 0 ? (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>📭</Text>
          <Text className={styles.emptyText}>
            {canCreate ? '还没有日记，开始写第一篇吧' : '这里还没有公开的日记'}
          </Text>
        </View>
      ) : (
        <View className={styles.diaryGrid}>
          {filteredDiaries.map(diary => {
            const bgmInfo = diary.bgm ? bgmTrack(diary.bgm) : null;
            return (
              <View
                key={diary.id}
                className={styles.diaryCard}
                style={{ borderColor: diary.frozen ? '#00d4ff' : getStateColor(diary.state) }}
                onClick={() => goToDetail(diary.id)}
              >
                <View className={styles.canvasWrapper}>
                  <canvas
                    ref={(el) => { canvasRefs.current.set(diary.id, el as any); }}
                    className={styles.cardCanvas}
                    width={320}
                    height={200}
                  />
                  
                  {bgmInfo && (
                    <View className={classNames(styles.badge, styles.bgmBadge)}>
                      🎵 {bgmInfo.name}
                    </View>
                  )}
                  
                  {diary.frozen && (
                    <View className={classNames(styles.badge, styles.frozenBadge)}>
                      ❄️ 已冻结
                    </View>
                  )}
                  
                  {diary.state === DiaryState.SCHEDULED && (
                    <View className={classNames(styles.badge, styles.scheduledBadge)}>
                      ⏰ 待发布
                    </View>
                  )}
                  
                  {diary.state === DiaryState.DEAD && (
                    <View className={styles.deadOverlay}>
                      🪦
                    </View>
                  )}
                </View>
                
                <View className={styles.cardContent}>
                  <View className={styles.cardHeader}>
                    <Text className={styles.cardTitle}>{diary.title}</Text>
                    <Text
                      className={styles.stateIndicator}
                      style={{ color: getStateColor(diary.state), borderColor: getStateColor(diary.state) }}
                    >
                      {getStateName(diary.state)}
                    </Text>
                  </View>
                  
                  <View className={styles.cardMeta}>
                    <Text>
                      {diaryTypes.find(([id]) => id === diary.type)?.[1]?.name || '未知类型'}
                    </Text>
                    <View>
                      {bgmInfo && (
                        <Text className={styles.bgmTag}>
                          {bgmInfo.icon} {bgmInfo.name}
                        </Text>
                      )}
                      <Text> 管线: {diary.pipeline.filter(p => p.enabled).length} 种</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {showCreateModal && (
        <View className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>✏️ 写新日记</Text>
              <Button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>✕</Button>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>标题</Text>
              <Input
                className={styles.formInput}
                placeholder="给日记起个名字..."
                value={title}
                onInput={(e) => setTitle(e.detail.value)}
                maxlength={50}
              />
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>日记类型</Text>
              <View className={styles.typeGrid}>
                {diaryTypes.map(([id, type]) => (
                  <Button
                    key={id}
                    className={classNames(styles.typeBtn, {
                      [styles.active]: selectedType === id
                    })}
                    onClick={() => setSelectedType(id)}
                  >
                    {type.name}
                    <Text style={{ fontSize: '20rpx', opacity: 0.6, marginLeft: '8rpx' }}>
                      (x{type.decayRate})
                    </Text>
                  </Button>
                ))}
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>内容</Text>
              <Textarea
                className={styles.formTextarea}
                placeholder="写下你想记录的内容..."
                value={content}
                onInput={(e) => setContent(e.detail.value)}
                maxlength={1000}
              />
              <Text style={{ textAlign: 'right', fontSize: '20rpx', color: '#666', marginTop: '8rpx' }}>
                {content.length}/1000
              </Text>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>选择烂法 (可多选)</Text>
              <View className={styles.methodGrid}>
                {decayMethods.map(([id, method]) => (
                  <Button
                    key={id}
                    className={classNames(styles.methodBtn, {
                      [styles.active]: selectedMethods.includes(id)
                    })}
                    onClick={() => toggleMethod(id)}
                  >
                    {method.name}
                  </Button>
                ))}
              </View>
            </View>

            <View>
              <View className={styles.sectionHeader} onClick={() => setShowBgmPicker(!showBgmPicker)}>
                <Text style={{ fontSize: '24rpx' }}>{showBgmPicker ? '▼' : '▶'}</Text>
                <Text className={styles.sectionTitle}>🎵 日记配乐</Text>
                <Text className={styles.sectionHint}>
                  {selectedBgm
                    ? `${bgmTrack(selectedBgm)?.icon} ${bgmTrack(selectedBgm)?.name}`
                    : '无'}
                </Text>
              </View>

              {showBgmPicker && (
                <View className={styles.collapsible}>
                  <Text style={{ fontSize: '22rpx', color: '#888', marginBottom: '16rpx' }}>
                    为公开日记绑定背景音效，访客查看时将一起播放，营造氛围感。
                  </Text>

                  <Button
                    className={classNames(styles.noBgmBtn, {
                      [styles.active]: selectedBgm === null
                    })}
                    onClick={() => setSelectedBgm(null)}
                  >
                    🔇 不配乐
                  </Button>

                  <View className={styles.bgmGrid}>
                    {BGM_TRACKS.map(track => (
                      <Button
                        key={track.id}
                        className={classNames(styles.bgmBtn, {
                          [styles.active]: selectedBgm === track.id
                        })}
                        onClick={() => setSelectedBgm(track.id)}
                      >
                        <View className={styles.bgmName}>
                          <Text>{track.icon}</Text>
                          <Text>{track.name}</Text>
                        </View>
                        <Text className={styles.bgmMood}>{track.mood}</Text>
                      </Button>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View className={styles.modalFooter}>
              <Button className={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>
                取消
              </Button>
              <Button
                className={styles.saveBtn}
                disabled={!canCreateDiary || isCreating}
                onClick={handleCreate}
              >
                {isCreating ? '保存中...' : '💾 保存日记'}
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default DiaryWallPage;
