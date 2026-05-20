import Terminal from "@/components/Terminal";
import { DEMO_CONFIG } from "@/lib/fallback";

export const dynamic = "force-static";

export default function DemoPage() {
  return <Terminal config={DEMO_CONFIG} />;
}

export const metadata = {
  title: "Demo — ai-dev-agent",
  description: "A prebuilt cinematic demo of ai-dev-agent confidently building a dog walking scheduler into oblivion."
};
