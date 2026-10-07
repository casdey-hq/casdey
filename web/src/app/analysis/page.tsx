import type { Metadata } from "next";
import { AnalysisFlow } from "@/components/analysis-flow";

export const metadata: Metadata = {
  title: "Your free glow-up analysis · Casdey",
  description: "Answer a few questions, add a photo, and get your score, your potential in 90 days, and the 3 changes that get you there. Free.",
};

export default function AnalysisPage() {
  return <AnalysisFlow />;
}
