/** This provider is for a local development server only; it is absent from production. */
export function allowDemoLogin(url: string, environment = process.env.NODE_ENV): boolean {
  if (environment !== 'development') return false;
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}
