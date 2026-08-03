/**
 * قشرة HTML لكل صفحة مُصدَّرة (ويب فقط).
 *
 * لماذا مهمة؟ Expo يولّد HTML ثابتاً لكل مسار. هذا الملف يضبط
 * ما يحتاجه Google **قبل** تحميل أي JavaScript — لأن زاحف Google
 * قد لا ينتظر تنفيذ الـ JS.
 */
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#0E6E5C" />

        {/* الخطوط العربية — preconnect يسرّع أول رسم */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap"
          rel="stylesheet"
        />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `
          html, body { margin: 0; background: #FDFBF7; }
          body { font-family: 'Tajawal', system-ui, sans-serif; }
          /* احترام تفضيل تقليل الحركة */
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              transition-duration: 0.01ms !important;
            }
          }
          /* تركيز واضح للوحة المفاتيح — متطلب وصولية */
          :focus-visible { outline: 3px solid #0E6E5C; outline-offset: 2px; }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
