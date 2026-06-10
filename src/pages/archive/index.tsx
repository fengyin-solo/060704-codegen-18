import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

const ArchivePage: React.FC = () => {
  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.title}>📦 档案馆</Text>
        <Text className={styles.subtitle}>查看已存档的历史日记</Text>
      </View>

      <View className={styles.placeholder}>
        <Text className={styles.placeholderIcon}>🏛️</Text>
        <Text className={styles.placeholderTitle}>档案馆</Text>
        <Text className={styles.placeholderText}>功能正在开发中...</Text>
      </View>
    </View>
  );
};

export default ArchivePage;
