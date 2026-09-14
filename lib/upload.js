// Vercel's serverless functions reject request bodies over 4.5MB at the
// platform edge, before the route runs — the caller just sees an opaque 413.
// Staying under that means an oversized upload fails with our own message.
//
// Shrunk photos land around 100-200KB, so this only ever affects images the
// browser could not decode (HEIC from an iPhone, most likely), which are sent
// through at their original size.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4MB";
