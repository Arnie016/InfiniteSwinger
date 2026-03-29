export const formatDurationMs = (value: number | null) => {
  if (value === null || !Number.isFinite(value) || value <= 0) return '--';
  const totalSeconds = Math.floor(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((value % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds
    .toString()
    .padStart(2, '0')}`;
};
