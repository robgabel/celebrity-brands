export function isWithinDays(date: string | null, days: number): boolean {
  if (!date) return false;
  const now = new Date();
  const compareDate = new Date(date);
  const diffTime = Math.abs(now.getTime() - compareDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}