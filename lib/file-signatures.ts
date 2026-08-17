// Определение реального типа файла по magic bytes, а не по Content-Type,
// присланному клиентом (который легко подделать).

function matches(bytes: Uint8Array, offset: number, signature: number[]): boolean {
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  return Array.from(bytes.slice(offset, offset + length))
    .map((b) => String.fromCharCode(b))
    .join('');
}

export type DetectedImageType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/avif';

/**
 * Возвращает реальный MIME-тип изображения по сигнатуре файла, либо null,
 * если сигнатура не распознана как одно из поддерживаемых изображений.
 */
export function detectImageMime(bytes: Uint8Array): DetectedImageType | null {
  if (matches(bytes, 0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (matches(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (matches(bytes, 0, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (asciiAt(bytes, 0, 4) === 'RIFF' && asciiAt(bytes, 8, 4) === 'WEBP') return 'image/webp';
  // AVIF — контейнер ISOBMFF: 4 байта размера box, затем "ftyp", затем major brand.
  if (asciiAt(bytes, 4, 4) === 'ftyp') {
    const brand = asciiAt(bytes, 8, 4);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  return null;
}
