// Helper de sombras — migra los props deprecados `shadow*` a `boxShadow`
// (soportado de forma cross-platform en React Native 0.81+ / New Architecture).
//
// Uso:
//   boxShadow('#000', 8, 16, 0.2)            → '0px 8px 16px rgba(0,0,0,0.2)'
//   boxShadow(colors.primary, 6, 12, 0.25)   → color dinámico desde el theme

/** Aplica una opacidad a un color hex (#rgb / #rrggbb). Si ya es rgb/rgba/named, lo deja igual. */
export function withOpacity(color: string, opacity: number): string {
  if (opacity >= 1) return color;
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color; // rgba()/rgb()/nombrado: usar tal cual
}

/** Construye un string `boxShadow` a partir de los antiguos props de sombra. */
export function boxShadow(
  color: string,
  offsetY: number,
  blur: number,
  opacity = 1,
  offsetX = 0,
): string {
  return `${offsetX}px ${offsetY}px ${blur}px ${withOpacity(color, opacity)}`;
}

/** Construye un string `textShadow` a partir de los antiguos props de textShadow*. */
export function textShadow(
  color: string,
  offsetY: number,
  blur: number,
  offsetX = 0,
): string {
  return `${offsetX}px ${offsetY}px ${blur}px ${color}`;
}
