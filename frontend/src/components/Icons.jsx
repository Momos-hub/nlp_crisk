/* Minimal inline SVG icons — stroke-based, inherit currentColor. */

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const Chevron = () => (
  <svg {...base} width="14" height="14"><path d="M6 3.5L10.5 8 6 12.5" /></svg>
);

export const Search = () => (
  <svg {...base}><circle cx="7" cy="7" r="4.2" /><path d="M10.2 10.2L13.5 13.5" /></svg>
);

export const Download = () => (
  <svg {...base}><path d="M8 2v7.5M5 7l3 2.8L11 7M2.8 12.2h10.4" /></svg>
);

export const Upload = () => (
  <svg {...base} width="20" height="20"><path d="M8 10V2.8M5.2 5.2L8 2.5l2.8 2.7M2.8 10.5v2.2a.9.9 0 00.9.9h8.6a.9.9 0 00.9-.9v-2.2" /></svg>
);

export const Plus = () => (
  <svg {...base}><path d="M8 3.2v9.6M3.2 8h9.6" /></svg>
);

export const Send = () => (
  <svg {...base}><path d="M2.2 8l4.6-1.8L8.2 2l3.6 6-3.6 6-1.4-4.2z" /></svg>
);

export const Doc = () => (
  <svg {...base}><path d="M9 2H4.5a.9.9 0 00-.9.9v10.2a.9.9 0 00.9.9h7a.9.9 0 00.9-.9V5.4zM9 2l2.7 2.9H9z" /></svg>
);

export const Alert = () => (
  <svg {...base}><path d="M8 2.8l5.4 9.6H2.6z" /><path d="M8 6.6v2.6M8 11.1h.01" /></svg>
);

export const Check = () => (
  <svg {...base}><path d="M3.2 8.4l3 2.8 6.4-6.8" /></svg>
);

export const Scale = () => (
  <svg
    width="15" height="15" viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M8 2.2v11.4M4.6 13.6h6.8M2.8 4.4h10.4M2.8 4.4L1.4 7.6h2.8zM13.2 4.4l-1.4 3.2h2.8zM8 2.2a.8.8 0 100-.1" />
  </svg>
);
