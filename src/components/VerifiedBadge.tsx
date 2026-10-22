// Blue verified badge. Granted manually by the Admin only (Admin > Users).
export default function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Compte certifié Wesh Star"
      aria-label="Compte certifié Wesh Star"
      className={"inline-flex align-middle " + className}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M12 1.5l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3-1-3 2.6-1.9 1-3 3.2.1L12 1.5z" fill="#1d9bf0" />
        <path d="M8 12.2l2.8 2.8L16.2 9.6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
