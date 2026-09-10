export function LoadingIndicator({ label = 'Loading…', fullPage = false }: { label?: string; fullPage?: boolean }) {
  return <div role="status" aria-live="polite" className={`oche-loading${fullPage ? ' oche-loading-page' : ''}`}>
    <svg className="oche-loading-board" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="27" stroke="currentColor" opacity=".25" />
      <circle cx="32" cy="32" r="18" stroke="currentColor" opacity=".35" />
      <circle className="oche-loading-ring" cx="32" cy="32" r="27" stroke="currentColor" strokeWidth="3" strokeDasharray="35 135" />
      <circle cx="32" cy="32" r="5" fill="currentColor" />
      <path d="M32 5v9M59 32h-9M32 59v-9M5 32h9" stroke="currentColor" />
    </svg>
    <span>{label}</span>
  </div>;
}
