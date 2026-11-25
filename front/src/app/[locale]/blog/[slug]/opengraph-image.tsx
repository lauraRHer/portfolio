import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { accentHex, constellations } from "@/content/blog";
import type { Locale } from "@/i18n/routing";
import { getPost } from "@/lib/blog/posts";

export const alt = "Bitácora · Laura Rodrigo Hernando";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Per-post Open Graph image, same look as the home one. */
export default async function PostOgImage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const post = getPost(locale as Locale, slug)?.post;
  const color = post ? accentHex[constellations[post.constellation].accent] : "#a78bfa";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#05050a", color: "#f2f2f7", padding: 72, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            right: -160,
            top: -120,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(139,92,246,0.45) 0%, rgba(224,64,251,0.15) 40%, transparent 70%)",
          }}
        />
        <div style={{ position: "absolute", right: 180, top: 150, width: 18, height: 18, borderRadius: 9999, background: "#f2f2f7", boxShadow: `0 0 40px 14px ${color}` }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
          <div style={{ fontSize: 26, letterSpacing: 6, color }}>{t("indexEyebrow").toUpperCase()}</div>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, maxWidth: 940 }}>{post?.title ?? ""}</div>
          <div style={{ fontSize: 28, color: "#a6a6c0" }}>Laura Rodrigo Hernando</div>
        </div>
      </div>
    ),
    size,
  );
}
