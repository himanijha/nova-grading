// Vercel's serverless functions reject request bodies over 4.5MB at the
// platform edge, before the route runs — the caller just sees an opaque 413.
// Staying under that means an oversized upload fails with our own message.
//
// Shrunk photos land around 100-200KB, so this only ever affects images the
// browser could not decode (HEIC from an iPhone, most likely), which are sent
// through at their original size.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4MB";

// Resumes can be bigger than one request allows: the browser sends them in
// MAX_UPLOAD_BYTES pieces and the server joins them. Downloads are streamed,
// which the platform does not cap.
export const MAX_RESUME_BYTES = 25 * 1024 * 1024;
export const MAX_RESUME_LABEL = "25MB";
