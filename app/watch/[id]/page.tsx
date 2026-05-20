import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Terminal from "@/components/Terminal";
import { loadConfig } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WatchPage({ params }: PageProps) {
  const { id } = await params;
  const record = await loadConfig(id);
  if (!record) {
    notFound();
  }

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const shareUrl = host ? `${proto}://${host}/watch/${id}` : `/watch/${id}`;

  return <Terminal config={record.config} shareUrl={shareUrl} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const record = await loadConfig(id);
  if (!record) return { title: "Not found" };
  return {
    title: `${record.config.appTitle} — ai-dev-agent`,
    description: `Watch ai-dev-agent confidently overengineer "${record.config.appIdea}" until it crashes after one ${record.config.finalUILabel.toLowerCase()}.`
  };
}
