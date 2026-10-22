/** File-signature checks. Browser-supplied MIME types are not trusted. */
export function isSupportedImage(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const starts = (...v: number[]) => v.every((b, i) => bytes[i] === b);
  // PNG, JPEG, GIF, WebP
  return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
    || starts(0xff, 0xd8, 0xff)
    || (starts(0x47, 0x49, 0x46, 0x38) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61)
    || (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50);
}

export function isSupportedVideo(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  // ISO BMFF (MP4/MOV): ftyp box at byte 4; WebM/Matroska: EBML signature.
  const ftyp = bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
  const webm = bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  return ftyp || webm;
}
