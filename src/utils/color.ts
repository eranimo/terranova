export function getHexColor(number: number): string {
  return ((number)>>>0).toString(16).slice(-6);
}

export function colorToNumber(r: number, g: number, b: number): number {
  return (r << 16) + (g << 8) + (b);
}
