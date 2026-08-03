/**
 * وسوم SEO — تُحقن في <head> على الويب فقط.
 *
 * لماذا هذا الملف مهم؟ لأن استهدافك **جميع الدول** يعني أن Google
 * يجب أن يفهم: أي نسخة لغوية يعرض لأي بلد. بدون hreflang سيعتبر
 * النسخ المترجمة **محتوى مكرراً** ويخفي أغلبها — وتضيع كل جهودك.
 *
 * ثلاثة أشياء يفعلها:
 *  1) الوسوم الأساسية + Open Graph (معاينة واتساب — قناتك الأولى)
 *  2) hreflang لكل لغة + x-default
 *  3) JSON-LD — يجعل Google يفهم أن هذي "منظمة تعليمية" و"كورسات"
 *     ويعرضها بشكل أغنى في النتائج
 */
import React from 'react';
import { Platform } from 'react-native';

const DOMAIN = 'https://edulink.app';   // بدّله بنطاقك

interface Props {
  title: string;
  description: string;
  path: string;                    // '/institutes/ems' بلا لغة
  lang: string;
  langs?: string[];                // اللغات المتاحة لهذي الصفحة
  image?: string;
  type?: 'website' | 'article';
  jsonLd?: object;
  publishedAt?: string;
}

export function Seo({
  title, description, path, lang, langs = ['ar', 'en', 'ms'],
  image, type = 'website', jsonLd, publishedAt
}: Props) {
  // على الجوال لا معنى لوسوم HTML
  if (Platform.OS !== 'web') return null;

  const url = `${DOMAIN}/${lang}${path}`;
  const img = image ?? `${DOMAIN}/og-default.png`;
  const isRtl = ['ar', 'he', 'fa', 'ur'].includes(lang);

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <html lang={lang} dir={isRtl ? 'rtl' : 'ltr'} />

      {/* hreflang — بدونه تُعتبر النسخ محتوى مكرراً */}
      {langs.map((l) => (
        <link key={l} rel="alternate" hrefLang={l} href={`${DOMAIN}/${l}${path}`} />
      ))}
      {/* x-default: لمن لا تطابق لغته أياً منها */}
      <link rel="alternate" hrefLang="x-default" href={`${DOMAIN}/en${path}`} />

      {/* Open Graph — معاينة واتساب وتويتر */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta property="og:locale" content={lang} />
      <meta property="og:site_name" content="EduLink" />
      {publishedAt && <meta property="article:published_time" content={publishedAt} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />

      <meta name="robots" content="index, follow, max-image-preview:large" />

      {/* JSON-LD — يثري ظهورك في النتائج */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </>
  );
}

/* ═══════════ مولّدات JSON-LD ═══════════ */

/** معهد = منظمة تعليمية + تقييم حقيقي (نجوم في نتائج Google) */
export function instituteSchema(i: {
  name: string; description: string; url: string; image?: string;
  address?: string; lat?: number; lng?: number;
  rating?: number | null; ratingCount?: number | null;
  phone?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: i.name,
    description: i.description,
    url: i.url,
    ...(i.image && { image: i.image }),
    ...(i.phone && { telephone: i.phone }),
    ...(i.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: i.address,
        addressLocality: 'Kuala Lumpur',
        addressCountry: 'MY',
      },
    }),
    ...(i.lat && i.lng && {
      geo: { '@type': 'GeoCoordinates', latitude: i.lat, longitude: i.lng },
    }),
    // ⚠️ تقييم حقيقي فقط — التقييم المزيّف يعاقبه Google بقسوة
    ...(i.rating && i.ratingCount && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: i.rating,
        reviewCount: i.ratingCount,
        bestRating: 5,
      },
    }),
  };
}

/** كورس — يظهر في نتائج Google التعليمية */
export function courseSchema(c: {
  name: string; description: string; provider: string; providerUrl: string;
  priceMyr?: number | null; estimated?: boolean;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: c.name,
    description: c.description,
    provider: {
      '@type': 'EducationalOrganization',
      name: c.provider,
      sameAs: c.providerUrl,
    },
    // نذكر السعر فقط إن كان مؤكداً — لا نضلّل Google ولا الطالب
    ...(c.priceMyr && !c.estimated && {
      offers: {
        '@type': 'Offer',
        price: c.priceMyr,
        priceCurrency: 'MYR',
        availability: 'https://schema.org/InStock',
      },
    }),
  };
}

/** أسئلة شائعة — قد تظهر كقائمة منسدلة داخل نتيجة البحث نفسها */
export function faqSchema(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  };
}

/** مقال */
export function articleSchema(a: {
  title: string; description: string; url: string; image?: string;
  published: string; modified?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    url: a.url,
    ...(a.image && { image: a.image }),
    datePublished: a.published,
    dateModified: a.modified ?? a.published,
    author: { '@type': 'Organization', name: 'EduLink' },
    publisher: {
      '@type': 'Organization',
      name: 'EduLink',
      logo: { '@type': 'ImageObject', url: `${DOMAIN}/logo.png` },
    },
  };
}

/** فتات الخبز — يحسّن شكل النتيجة */
export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
