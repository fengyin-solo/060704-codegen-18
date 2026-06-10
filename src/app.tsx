import React, { useEffect } from 'react';
import { useDidShow, useDidHide } from '@tarojs/taro';
import { useUserStore, useDiaryStore } from '@/stores';
// 全局样式
import './app.scss';

function App(props) {
  const userStoreInit = useUserStore(state => state.init);
  const diaryStoreInit = useDiaryStore(state => state.init);

  useEffect(() => {
    userStoreInit();
    diaryStoreInit();
  }, [userStoreInit, diaryStoreInit]);

  useDidShow(() => {
    diaryStoreInit();
  });

  useDidHide(() => {});

  return props.children;
}

export default App;
