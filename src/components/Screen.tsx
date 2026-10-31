import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, MAX_CONTENT_WIDTH, space } from '@/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  /** Tab screens leave the bottom edge to the tab bar. */
  edges?: Edge[];
};

/** Night-sky background, safe areas, and a comfortable max width on big screens. */
export function Screen({ children, scroll = true, edges = ['top'] }: Props) {
  const body = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sky },
  scroll: { flexGrow: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xl,
    gap: space.lg,
  },
});
