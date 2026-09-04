const MONTH_LABELS = [
  'jan.',
  'fev.',
  'mar.',
  'abr.',
  'mai.',
  'jun.',
  'jul.',
  'ago.',
  'set.',
  'out.',
  'nov.',
  'dez.',
];

export function formatNotificationDate(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return 'Data indisponível';
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return 'Data indisponível';
  }

  const time = formatTime(date);

  if (isToday(date)) {
    return `Hoje, ${time}`;
  }

  if (isYesterday(date)) {
    return `Ontem, ${time}`;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_LABELS[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}, ${time}`;
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function isToday(date: Date): boolean {
  const today = new Date();

  return sameCalendarDate(date, today);
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return sameCalendarDate(date, yesterday);
}

function sameCalendarDate(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}
