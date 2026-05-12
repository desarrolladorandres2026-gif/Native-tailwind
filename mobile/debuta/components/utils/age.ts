export function getAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function getDistance(
  lat1: number | null, lon1: number | null,
  lat2: number | null, lon2: number | null
): string {
  if (!lat1 || !lon1 || !lat2 || !lon2) return '';
  const R = 6371;
  const dL = ((lat2 - lat1) * Math.PI) / 180;
  const dO = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dL / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dO / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return km < 1 ? 'menos de 1 km' : `${Math.round(km)} km`;
}

export function relativeTime(dateString: string | Date | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Ahora';
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours} h`;
  if (diffDays < 7) return `${diffDays} d`;
  return date.toLocaleDateString();
}

/**
 * Formatea la última vez en línea para mostrar en el header del chat / lista de matches.
 * Ejemplo: "en línea", "hace 5 min", "hace 2 h", "ayer", "hace 3 días"
 */
export function lastSeenText(online: boolean, lastSeen: Date | null): string {
  if (online) return 'en línea';
  if (!lastSeen) return 'desconectado';

  const now     = new Date();
  const diffMs  = now.getTime() - lastSeen.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH   = Math.floor(diffMin / 60);
  const diffD   = Math.floor(diffH   / 24);

  if (diffMin < 1)  return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffH   < 24) return `hace ${diffH} h`;
  if (diffD   === 1) return 'ayer';
  if (diffD   <  7)  return `hace ${diffD} días`;
  return lastSeen.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}
