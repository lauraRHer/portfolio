import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const alt = "Laura Rodrigo Hernando — Full-Stack → AI Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Per-locale Open Graph image. Uses the default font to stay dependency-free. */
export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });
  const tCore = await getTranslations({ locale, namespace: "core" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#05050a",
          color: "#f2f2f7",
          padding: 72,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -120,
            top: 40,
            width: 640,
            height: 640,
            borderRadius: 9999,
            background: "radial-gradient(circle, #ffffff 0%, #e040fb 12%, rgba(139,92,246,0.55) 35%, rgba(34,211,238,0.15) 60%, transparent 72%)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 720 }}>
          <div style={{ fontSize: 26, letterSpacing: 6, color: "#a78bfa" }}>FULL-STACK → AI ENGINEER</div>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1, marginTop: 24 }}>Laura Rodrigo Hernando</div>
          <div style={{ fontSize: 34, color: "#a6a6c0", marginTop: 28 }}>{t("title")}</div>
          <div style={{ fontSize: 24, color: "#22d3ee", marginTop: 40 }}>{tCore("facts.stack")}</div>
        </div>
      </div>
    ),
    size,
  );
}
