import { StyleSheet, Text, View } from 'react-native';
import { formatScore, formatStartsAt, statusLabel, type Match } from '../matches';
import { FavoriteButton } from './FavoriteButton';

type Props = {
  match: Match;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
};

export function MatchCard({ match, favorite, onToggleFavorite }: Props) {
  const score = formatScore(match.score);
  const live = match.status === 'live';

  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <TeamRow name={match.home.name} goals={score ? match.score?.home : undefined} />
        <TeamRow name={match.away.name} goals={score ? match.score?.away : undefined} />
        <Text style={[styles.meta, live && styles.live]}>
          {formatStartsAt(match.startsAt)} · {statusLabel(match)}
        </Text>
      </View>
      <FavoriteButton active={favorite} onPress={() => onToggleFavorite(match.id)} />
    </View>
  );
}

function TeamRow({ name, goals }: { name: string; goals: number | undefined }) {
  return (
    <View style={styles.row}>
      <Text style={styles.team} numberOfLines={1}>
        {name}
      </Text>
      {goals !== undefined ? <Text style={styles.score}>{goals}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  team: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  score: {
    minWidth: 16,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  live: {
    color: '#ef3124',
    fontWeight: '600',
  },
});
