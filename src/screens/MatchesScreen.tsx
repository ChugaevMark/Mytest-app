import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MatchCard } from '../components/MatchCard';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { useFavorites } from '../hooks/useFavorites';
import {
  loadMatches,
  matchesFilter,
  matchesQuery,
  type Match,
  type MatchFilter,
  type MatchesPayload,
} from '../matches';

const FILTERS: { id: MatchFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'upcoming', label: 'Предстоящие' },
  { id: 'finished', label: 'Завершённые' },
];

type Phase =
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'ready'; payload: MatchesPayload; updatedAt: Date };

export function MatchesScreen() {
  const [phase, setPhase] = useState<Phase>({ type: 'loading' });
  const [filter, setFilter] = useState<MatchFilter>('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { favorites, isFavorite, toggle } = useFavorites();

  const load = useCallback(async (kind: 'initial' | 'refresh') => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    if (kind === 'initial') {
      setPhase({ type: 'loading' });
      setRefreshError(null);
    } else {
      setRefreshing(true);
      setRefreshError(null);
    }

    try {
      const payload = await loadMatches(signal);
      if (signal.aborted) return;
      setPhase({ type: 'ready', payload, updatedAt: new Date() });
      setRefreshError(null);
    } catch (error) {
      if (signal.aborted) return;
      const message = error instanceof Error ? error.message : 'Не удалось загрузить матчи';
      if (kind === 'initial') {
        setPhase({ type: 'error', message });
      } else {
        setRefreshError(message);
      }
    } finally {
      if (!signal.aborted) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load('initial');
    return () => abortRef.current?.abort();
  }, [load]);

  const matches = phase.type === 'ready' ? phase.payload.matches : [];
  const visible = useMemo(
    () => matches.filter((match) => matchesFilter(match, filter) && matchesQuery(match, query)),
    [matches, filter, query],
  );

  const renderItem = useCallback(
    ({ item }: { item: Match }) => (
      <MatchCard match={item} favorite={isFavorite(item.id)} onToggleFavorite={toggle} />
    ),
    [isFavorite, toggle],
  );

  const emptyMessage = emptyText(phase, visible.length, query);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Матчи тура</Text>
          {phase.type === 'ready' && phase.payload.round !== null ? (
            <Text style={styles.round}>Тур {phase.payload.round}</Text>
          ) : null}
        </View>
        <Pressable
          style={[styles.refresh, (phase.type !== 'ready' || refreshing) && styles.refreshDisabled]}
          onPress={() => void load('refresh')}
          disabled={phase.type !== 'ready' || refreshing}
          accessibilityRole="button"
          accessibilityLabel="Обновить"
        >
          <Text style={styles.refreshText}>{refreshing ? 'Обновляем…' : 'Обновить'}</Text>
        </Pressable>
      </View>

      {phase.type === 'ready' ? (
        <View style={styles.ago}>
          <UpdatedAgo since={phase.updatedAt} />
        </View>
      ) : (
        <View style={styles.agoSpacer} />
      )}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Поиск по клубу"
        placeholderTextColor="#9ca3af"
        style={styles.search}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />

      <View style={styles.filters}>
        {FILTERS.map((item) => {
          const active = item.id === filter;
          return (
            <Pressable
              key={item.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {refreshError ? <Text style={styles.refreshError}>{refreshError}</Text> : null}

      {phase.type === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.centerText}>Загружаем матчи</Text>
        </View>
      ) : null}

      {phase.type === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Не получилось загрузить матчи</Text>
          <Text style={styles.centerText}>{phase.message}</Text>
          <Pressable style={styles.retry} onPress={() => void load('initial')} accessibilityRole="button">
            <Text style={styles.retryText}>Повторить</Text>
          </Pressable>
        </View>
      ) : null}

      {phase.type === 'ready' ? (
        <FlatList
          style={styles.list}
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          extraData={favorites}
          refreshing={refreshing}
          onRefresh={() => void load('refresh')}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={visible.length === 0 ? styles.emptyList : styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>{emptyMessage}</Text>}
        />
      ) : null}
    </View>
  );
}

function emptyText(phase: Phase, visibleCount: number, query: string): string {
  if (phase.type !== 'ready' || visibleCount > 0) return '';
  if (phase.payload.matches.length === 0) return 'Матчей тура пока нет';
  if (query.trim()) return 'Ничего не найдено';
  return 'В этой категории матчей нет';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  round: {
    fontSize: 14,
    color: '#6b7280',
  },
  refresh: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  refreshDisabled: {
    opacity: 0.45,
  },
  refreshText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  ago: {
    marginTop: 4,
  },
  agoSpacer: {
    height: 18,
    marginTop: 4,
  },
  search: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111827',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  chipText: {
    fontSize: 14,
    color: '#111827',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  refreshError: {
    marginBottom: 8,
    color: '#b91c1c',
    fontSize: 13,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  centerText: {
    color: '#6b7280',
    fontSize: 15,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  retry: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
