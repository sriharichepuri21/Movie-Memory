import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;
export function ReelIcon(props: Props) {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}><circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5"/><circle cx="16" cy="9" r="3" fill="currentColor"/><circle cx="9" cy="17" r="3" fill="currentColor"/><circle cx="23" cy="17" r="3" fill="currentColor"/><circle cx="16" cy="24" r="2" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/></svg>;
}
export function RefreshIcon(props: Props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3"/></svg>;
}
export function GoogleIcon(props: Props) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3L15.4 17c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3a10 10 0 0 0 0 8.8l3.4-2.6Z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.6l3.4 2.6C7.2 7.8 9.4 6.1 12 6.1Z"/></svg>;
}
