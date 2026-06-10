import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

const MinePage: React.FC = () => {
  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.title}>👤 我的</Text>
        <Text className={styles.subtitle}>个人中心与设置</Text>
      </View>

      <View className={styles.placeholder}>
        <Text className={styles.placeholderIcon}>🎒</Text>
        <Text className={styles.placeholderTitle}>我的</Text>
        <Text className={styles.placeholderText}>功能正在开发中...</Text>
      </View>
    </View>
  );
};

export default MinePage;
