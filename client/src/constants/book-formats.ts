export const BOOK_PAGE_DIMENSIONS = {
  A4: { width: 2480, height: 3508 }, // 21cm x 29.7cm
  A5: { width: 1748, height: 2480 }, // 14.8cm x 21cm
//   A3: { width: 3508, height: 4961 }, // 29.7cm x 42cm
//   Letter: { width: 2550, height: 3300 }, // 8.5in x 11in
  Square: { width: 2480, height: 2480 }, // 21cm x 21cm
} as const;

export type BookPageSize = keyof typeof BOOK_PAGE_DIMENSIONS;

export const BOOK_ORIENTATIONS = ['portrait', 'landscape'] as const;
export type BookOrientation = (typeof BOOK_ORIENTATIONS)[number];

export const DEFAULT_BOOK_PAGE_SIZE: BookPageSize = 'A4';
export const DEFAULT_BOOK_ORIENTATION: BookOrientation = 'portrait';

// Safety margin for printing: 10mm at 300 DPI
export const SAFETY_MARGIN_MM = 10;
export const SAFETY_MARGIN_PX = SAFETY_MARGIN_MM * 11.811; // ≈118px

