import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";
import { MotionPreferenceProvider } from "@/providers/MotionPreferenceProvider";
import "../globals.css";

const display = Space_Grotesk({ subsets: ["latin", "latin-ext"], weight: ["500", "700"], variable: "--font-space-grotesk" });
const sans = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin", "latin-ext"], weight: ["400", "500"], variable: "--font-jetbrains" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: "#05050a", colorScheme: "dark" };

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(siteConfig.url),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: { es: "/es", en: "/en", "x-default": "/es" },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("description"),
      type: "website",
      locale: locale === "es" ? "es_ES" : "en_US",
      siteName: siteConfig.name,
    },
    twitter: { card: "summary_large_image", title: t("ogTitle"), description: t("description") },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // Enables static rendering for this locale.
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${display.variable} ${sans.variable} ${mono.variable}`} data-scroll-behavior="smooth">
      <body className="grain min-h-svh">
        {/* Without JS, scroll-reveal content would stay at opacity 0: show it as is. */}
        <noscript>
          <style>{`[style*="opacity:0"]{opacity:1!important;transform:none!important;filter:none!important}`}</style>
        </noscript>
        <NextIntlClientProvider>
          <MotionPreferenceProvider>{children}</MotionPreferenceProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
