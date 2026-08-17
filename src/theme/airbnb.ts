// ─── Airbnb Design Tokens for StayMate ─────────────────────────────────────────
// Exact 1:1 extraction from staymate-airbnb-redesign/app.html & DESIGN.md
// ─────────────────────────────────────────────────────────────────────────────

export const AIRBNB = {
  colors: {
    primary: '#ff385c',          // Rausch
    primaryActive: '#e00b41',
    primaryDisabled: '#ffd1da',
    primaryGradient: ['#ff5a7a', '#ff385c', '#e00b41'] as const,
    ink: '#222222',              // Primary text & headlines
    body: '#3f3f3f',             // Running text
    muted: '#6a6a6a',            // Subtitles & captions
    mutedSoft: '#929292',        // Placeholders & inactive tabs
    hairline: '#dddddd',         // 1px outlines
    hairlineSoft: '#ebebeb',     // Dividers & card outlines
    borderStrong: '#c1c1c1',
    canvas: '#ffffff',           // Floor / page background
    surfaceSoft: '#f7f7f7',      // Soft background fills
    surfaceStrong: '#f2f2f2',    // Icon wells & soft buttons
    onPrimary: '#ffffff',
    
    // Status badges & accents
    emerald: '#008a05',
    emeraldBg: '#e5f6e6',
    sky: '#0f7dc2',
    skyBg: '#e7f3fb',
    amber: '#b45900',
    amberBg: '#fff2e0',
    rose: '#c13515',
    roseBg: '#fdeae5',
    
    avatarGradient: ['#ffd1da', '#ff9db0'] as const,
    avatarText: '#8a0030',
  },
  
  radius: {
    xs: 4,
    sm: 8,                       // Buttons, form inputs
    md: 14,                      // Cards, metric cards, doc cards
    lg: 20,                      // Viewfinder, plan cards
    xl: 32,
    sheet: 24,                   // Bottom sheet top corners
    full: 9999,                  // Pills, tab bar, FAB, avatars
  },
  
  typography: {
    displayLg: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.4, lineHeight: 26 },
    displayMd: { fontSize: 20, fontWeight: '700' as const, lineHeight: 25 },
    titleMd: { fontSize: 16, fontWeight: '600' as const },
    titleSm: { fontSize: 15, fontWeight: '500' as const },
    bodyMd: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
    bodySm: { fontSize: 13.5, fontWeight: '400' as const },
    caption: { fontSize: 12.5, fontWeight: '500' as const },
    micro: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.2 },
  },
  
  shadow: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    fab: {
      shadowColor: '#ff385c',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.55,
      shadowRadius: 16,
      elevation: 10,
    },
    tabBar: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 8,
    },
    sheet: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 16,
    },
  },
};

export default AIRBNB;
