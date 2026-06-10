import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

const LoginPage: React.FC = () => {
  return (
    <View className={styles.container}>
      <View className={styles.placeholder}>
        <Text className={styles.placeholderIcon}>🔐</Text>
        <Text className={styles.placeholderTitle}>登录</Text>
        <Text className={styles.placeholderText}>功能正在开发中...</Text>
      </View>
    </View>
  );
};

export default LoginPage;
