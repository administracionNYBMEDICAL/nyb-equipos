/** Tailwind: los componentes usan roles (bg-surface, text-muted), nunca hex. */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        "bg": "var(--color-bg)",
        "surface": "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        "border": "var(--color-border)",
        "border-input": "var(--color-border-input)",
        "text": "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        "brand": "var(--color-brand)",
        "on-brand": "var(--color-on-brand)",
        "brand-muted": "var(--color-brand-muted)",
        "brand-hover": "var(--color-brand-hover)",
        "accent": "var(--color-accent)",
        "on-accent": "var(--color-on-accent)",
        "accent-strong": "var(--color-accent-strong)",
        "on-accent-strong": "var(--color-on-accent-strong)",
        "accent-soft": "var(--color-accent-soft)",
        "celeste": "var(--color-celeste)",
        "focus": "var(--color-focus)",
        "success": "var(--color-success)",
        "success-soft": "var(--color-success-soft)",
        "warning": "var(--color-warning)",
        "warning-soft": "var(--color-warning-soft)",
        "danger": "var(--color-danger)",
        "danger-soft": "var(--color-danger-soft)",
        "info": "var(--color-info)",
        "info-soft": "var(--color-info-soft)",
        "violet": "var(--color-violet)",
        "violet-soft": "var(--color-violet-soft)",
        "neutral": "var(--color-neutral)",
        "neutral-soft": "var(--color-neutral-soft)"
      },
      fontFamily: { sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', pill: 'var(--radius-pill)' },
      boxShadow: { card: 'var(--shadow-card)', pop: 'var(--shadow-pop)' },
      fontSize: {
        "xs": [
                "12px",
                {
                        "lineHeight": "16px",
                        "fontWeight": "500"
                }
        ],
        "sm": [
                "14px",
                {
                        "lineHeight": "20px",
                        "fontWeight": "400"
                }
        ],
        "base": [
                "16px",
                {
                        "lineHeight": "24px",
                        "fontWeight": "400"
                }
        ],
        "lg": [
                "20px",
                {
                        "lineHeight": "28px",
                        "fontWeight": "600"
                }
        ],
        "xl": [
                "28px",
                {
                        "lineHeight": "34px",
                        "fontWeight": "700"
                }
        ],
        "display": [
                "40px",
                {
                        "lineHeight": "44px",
                        "fontWeight": "700"
                }
        ],
        "eyebrow": [
                "12px",
                {
                        "lineHeight": "16px",
                        "fontWeight": "600"
                }
        ]
},
      width: { sidebar: 'var(--layout-sidebar)' },
      maxWidth: { content: 'var(--layout-content-max)', 'qr-card': 'var(--layout-qr-card-max)' },
      minHeight: { tap: 'var(--layout-tap-min)' },
    },
  },
};
