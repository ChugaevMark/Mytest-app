import { MATCHES_URL } from './config';

export type Club = {
  id: string;
  name: string;
  city: string;
};

export type Score = {
  home: number;
  away: number;
};

export type Match = {
  id: string;
  startsAt: string | null;
  status: string;
  minute?: number;
  home: Club;
  away: Club;
  score: Score | null;
};

export type MatchesPayload = {
  round: number | null;
  matches: Match[];
};

export type MatchFilter = 'all' | 'upcoming' | 'finished';

const UPCOMING_STATUSES = new Set(['scheduled', 'postponed', 'live']);

export function parseMatchesPayload(data: unknown): MatchesPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('Некорректный ответ сервера');
  }

  const body = data as Record<string, unknown>;
  if (!Array.isArray(body.matches)) {
    throw new Error('В ответе нет списка матчей');
  }

  return {
    round: typeof body.round === 'number' ? body.round : null,
    matches: body.matches.flatMap((item) => {
      const match = parseMatch(item);
      return match ? [match] : [];
    }),
  };
}

export async function loadMatches(signal?: AbortSignal): Promise<MatchesPayload> {
  let response: Response;
  try {
    response = await fetch(MATCHES_URL, { signal });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new Error('Нет соединения с сервером');
  }

  if (!response.ok) {
    throw new Error(`Не удалось загрузить матчи (${response.status})`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('Сервер вернул не JSON');
  }

  return parseMatchesPayload(body);
}

export function matchesFilter(match: Match, filter: MatchFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'finished') return match.status === 'finished';
  return UPCOMING_STATUSES.has(match.status);
}

export function matchesQuery(match: Match, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    match.home.name.toLowerCase().includes(normalized) ||
    match.away.name.toLowerCase().includes(normalized)
  );
}

export function formatStartsAt(startsAt: string | null): string {
  if (!startsAt) return 'Дата не назначена';
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return 'Некорректная дата';
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function statusLabel(match: Match): string {
  switch (match.status) {
    case 'finished':
      return 'Завершён';
    case 'live':
      return typeof match.minute === 'number' ? `Идёт, ${match.minute}′` : 'Идёт';
    case 'scheduled':
      return 'Предстоит';
    case 'postponed':
      return 'Перенесён';
    default:
      return 'Неизвестный статус';
  }
}

export function formatScore(score: Score | null): string | null {
  if (!score) return null;
  return `${score.home}:${score.away}`;
}

function parseMatch(value: unknown): Match | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.status !== 'string') return null;

  const home = parseClub(record.home);
  const away = parseClub(record.away);
  if (!home || !away) return null;

  const match: Match = {
    id: record.id,
    startsAt: typeof record.startsAt === 'string' && record.startsAt.length > 0 ? record.startsAt : null,
    status: record.status,
    home,
    away,
    score: parseScore(record.score),
  };

  if (typeof record.minute === 'number') {
    match.minute = record.minute;
  }

  return match;
}

function parseClub(value: unknown): Club | null {
  if (!value || typeof value !== 'object') return null;
  const club = value as Record<string, unknown>;
  if (typeof club.id !== 'string' || typeof club.name !== 'string') return null;
  return {
    id: club.id,
    name: club.name,
    city: typeof club.city === 'string' ? club.city : '',
  };
}

function parseScore(value: unknown): Score | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return null;
  const score = value as Record<string, unknown>;
  if (typeof score.home !== 'number' || typeof score.away !== 'number') return null;
  return { home: score.home, away: score.away };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
