import { notFound } from "next/navigation";
import { MascotPreview } from "@/components/mascot3d/MascotPreview";

/** Dev-only playground for the 3D mascot (expressions, poses, lighting). */
export default function MascotPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MascotPreview />;
}
