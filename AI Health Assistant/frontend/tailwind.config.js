/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1A73E8',
        primaryDark: '#0D47A1',
        success: '#34A853',
        danger: '#EA4335',
        warning: '#FBBC04',
        background: '#F9FAFB',
        card: '#FFFFFF',
        foreground: '#1C1C1E',
        muted: '#6B7280',
        border: '#E5E7EB',
      },
      boxShadow: {
        card: '0 2px 16px rgba(0, 0, 0, 0.07)',
        'card-hover': '0 6px 28px rgba(0, 0, 0, 0.12)',
        'primary-glow': '0 4px 20px rgba(26, 115, 232, 0.30)',
        'success-glow': '0 4px 20px rgba(52, 168, 83, 0.30)',
        'input-focus': '0 0 0 3px rgba(26, 115, 232, 0.15)',
      },
      borderRadius: {
        app: '12px',
        card: '18px',
        pill: '50px',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #1A73E8 0%, #0D47A1 100%)',
        'gradient-primary-soft': 'linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)',
        'gradient-surface': 'linear-gradient(180deg, #FFFFFF 0%, #F5F8FF 100%)',
        'gradient-hero': 'linear-gradient(135deg, #EBF3FF 0%, #F0F7FF 50%, #F9FAFB 100%)',
      },
      keyframes: {
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.6)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-heart': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
        'wave-bar': {
          '0%, 100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'slide-up-fade': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'section-reveal': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.75)', opacity: '0' },
          '60%': { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'scale-in': 'scale-in 0.45s ease-out',
        'pulse-heart': 'pulse-heart 1.8s ease-in-out infinite',
        'wave-bar': 'wave-bar 0.9s ease-in-out infinite',
        'slide-up-fade': 'slide-up-fade 0.35s ease-out both',
        'section-reveal': 'section-reveal 0.3s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out',
        'bounce-in': 'bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
