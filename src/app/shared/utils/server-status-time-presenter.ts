export function presentServerStatusTime(
  timestamp: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!timestamp) {
    return 'Nunca observado.';
  }

  const observedAt = new Date(timestamp);
  if (Number.isNaN(observedAt.getTime())) {
    return 'Nunca observado.';
  }

  const elapsedMilliseconds = Math.max(0, now.getTime() - observedAt.getTime());
  const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);

  if (elapsedSeconds < 60) {
    return 'Agora.';
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `Há ${elapsedMinutes} min.`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `Há ${elapsedHours} h.`;
}
