import type { Metadata } from "next";
import { AnalysisFlow } from "@/components/analysis-flow";

export const metadata: Metadata = {
  title: "Your free glow-up analysis · Casdey",
  description: "Answer a few questions, add a photo, and see the 3 changes that would make the biggest difference to how you look. Free, no score.",
};

export default function AnalysisPage() {
  return <AnalysisFlow />;
}
