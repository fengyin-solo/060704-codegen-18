import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

const GalleryPage: React.FC = () => {
  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.title}>🏛️ 展览馆</Text>
        <Text className={styles.subtitle}>浏览公开的数字腐朽艺术作品</Text>
      </View>

      <View className={styles.placeholder}>
        <Text className={styles.placeholderIcon}>🎨</Text>
        <Text className={styles.placeholderTitle}>展览馆</Text>
        <Text className={styles.placeholderText}>功能正在开发中...</Text>
      </View>
    </View>
  );
};

export default GalleryPage;
