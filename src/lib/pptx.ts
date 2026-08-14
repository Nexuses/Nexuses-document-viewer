export function countPptxSlides(buffer: Buffer): number {
  const names = buffer.toString('binary').match(/ppt\/slides\/slide\d+\.xml/g);
  if (!names?.length) return 0;
  return new Set(names).size;
}
