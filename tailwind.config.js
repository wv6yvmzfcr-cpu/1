/** @type {import('tailwindcss').Config} */

/**
 * نظام التصميم — إيدولينك
 * ═══════════════════════════════════════════════════════════
 *
 * الفكرة: الرحلة من الرياض إلى كوالالمبور.
 * الطالب يترك رمالاً دافئة ويصل إلى خضرة استوائية.
 * فالواجهة تعيش بين اللونين: خضرة ماليزيا الغنية،
 * ودفء رملي يذكّر بالبيت — بدل الأبيض الطبي البارد.
 *
 * القرارات:
 * • الأخضر: مشتق من غابات ماليزيا المطيرة، لا أخضر افتراضي.
 * • الرمل: خلفية دافئة تريح العين في القراءة الطويلة (والطالب
 *   سيقرأ كثيراً: شروط، متطلبات، أسعار).
 * • الذهبي: من الهيبسكس — زهرة ماليزيا الوطنية. للتنبيه لا للزينة.
 * • الحبر: أزرق مائل لا أسود — أرحم للعين في النصوص العربية.
 */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // الأخضر — من غابات ماليزيا
        primary: {
          DEFAULT: '#0E6E5C',
          dark:    '#083D33',   // للنصوص على خلفية فاتحة
          mid:     '#12897A',
          light:   '#E3F0EC',   // خلفيات هادئة
          tint:    '#F2F8F6'    // أخف — للتظليل
        },
        // الذهبي — هيبسكس ماليزيا. للتنبيه والتقديري فقط
        accent: {
          DEFAULT: '#C88A2E',
          light:   '#FBF1E0',
          dark:    '#8A5D14'
        },
        // الحبر — أزرق مائل، أرحم للعربية من الأسود
        ink: {
          DEFAULT: '#141F2B',
          soft:    '#5A6B7C',
          faint:   '#8FA0AF'
        },
        // الأسطح — رملي دافئ لا أبيض بارد
        surface: {
          DEFAULT: '#FFFFFF',
          warm:    '#FDFBF7',   // خلفية الصفحة
          sand:    '#F5F1EA',   // بطاقات ثانوية
          line:    '#E8E2D8'    // حدود
        },
        // دلالية
        ok:    { DEFAULT: '#1B7A47', light: '#E4F3EA' },
        warn:  { DEFAULT: '#C88A2E', light: '#FBF1E0' },
        error: { DEFAULT: '#C0392B', light: '#FBEAE8' }
      },
      fontFamily: {
        // العربية تحتاج خطاً يتنفس — الافتراضي يخنقها
        display: ['Tajawal_700Bold', 'System'],
        body:    ['Tajawal_400Regular', 'System'],
        bold:    ['Tajawal_500Medium', 'System']
      },
      fontSize: {
        // سلّم مضبوط — العربية تحتاج ارتفاع سطر أعلى من اللاتينية
        'xs':   ['11px', { lineHeight: '18px' }],
        'sm':   ['13px', { lineHeight: '22px' }],
        'base': ['15px', { lineHeight: '26px' }],
        'lg':   ['17px', { lineHeight: '28px' }],
        'xl':   ['20px', { lineHeight: '30px' }],
        '2xl':  ['24px', { lineHeight: '34px' }],
        '3xl':  ['30px', { lineHeight: '40px' }]
      },
      borderRadius: {
        'card': '18px',
        'pill': '999px'
      },
      boxShadow: {
        'card': '0 1px 3px rgba(20,31,43,0.04), 0 4px 16px rgba(20,31,43,0.06)',
        'lift': '0 4px 12px rgba(20,31,43,0.08), 0 12px 32px rgba(20,31,43,0.10)'
      }
    }
  },
  plugins: []
};
