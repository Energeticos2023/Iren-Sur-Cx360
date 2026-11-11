// CX360 – íconos lineales propios (SVG en línea, sin dependencias externas).
const svg = (d, extra = '') => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"${extra}>${d}</svg>`;
const s = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
export const icons = {
  home: svg(`<path ${s} d="M3 11.5 12 4l9 7.5"/><path ${s} d="M5.5 10v9.5h13V10"/><path ${s} d="M10 19.5v-5h4v5"/>`),
  chat: svg(`<path ${s} d="M4 5.5h16v10H9l-4.5 3.5v-3.5H4z"/><path ${s} d="M8 9.5h8M8 12.5h5"/>`),
  plan: svg(`<rect ${s} x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path ${s} d="M3.5 9h17M9 9v10.5M14.5 9v10.5"/>`),
  bell: svg(`<path ${s} d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path ${s} d="M10 20.5h4"/>`),
  list: svg(`<path ${s} d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="5" cy="6.5" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="5" cy="17.5" r="1.2" fill="currentColor"/>`),
  clock: svg(`<circle ${s} cx="12" cy="12" r="8.5"/><path ${s} d="M12 7.5V12l3 2"/>`),
  gear: svg(`<circle ${s} cx="12" cy="12" r="3"/><path ${s} d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/>`),
  menu: svg(`<path ${s} d="M4 7h16M4 12h16M4 17h16"/>`),
  close: svg(`<path ${s} d="M6 6l12 12M18 6 6 18"/>`),
  refresh: svg(`<path ${s} d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path ${s} d="M19.5 4.5v4h-4"/>`),
  report: svg(`<path ${s} d="M6.5 3.5h8l3 3v14h-11z"/><path ${s} d="M9 11h6M9 14.5h6M9 18h4"/>`),
  arrow: svg(`<path ${s} d="M9 6l6 6-6 6"/>`),
  // Especialidades
  IIEE: svg(`<path ${s} d="M13 3 5.5 13.5H11L10 21l8-11h-5.5z"/>`),
  IISS: svg(`<path ${s} d="M12 3.5c3.5 4.6 5.5 7.8 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.7 2-5.9 5.5-10.5z"/>`),
  IIMM: svg(`<circle ${s} cx="12" cy="12" r="1.8"/><path ${s} d="M12 10.2c0-3.5 1-6 3.2-6.2 2.4.1 2.6 3 .6 5M13.8 12c3.5 0 6 1 6.2 3.2-.1 2.4-3 2.6-5 .6M12 13.8c0 3.5-1 6-3.2 6.2-2.4-.1-2.6-3-.6-5M10.2 12c-3.5 0-6-1-6.2-3.2.1-2.4 3-2.6 5-.6"/>`),
  TIC: svg(`<rect ${s} x="9" y="3.5" width="6" height="4.5" rx="1"/><rect ${s} x="3" y="16" width="6" height="4.5" rx="1"/><rect ${s} x="15" y="16" width="6" height="4.5" rx="1"/><path ${s} d="M12 8v4M6 16v-4h12v4"/>`),
  EM: svg(`<path ${s} d="M3 12.5h4l2-5 3.5 10 2.5-6.5 1.5 1.5H21"/>`),
};
