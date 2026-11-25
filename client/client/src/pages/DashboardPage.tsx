// @ts-ignore
import VoiceAgent from "@/components/VoiceAgent";
import { BeyondwordsSubsection } from "./sections/BeyondwordsSubsection";

export const DashboardPage = (): JSX.Element => {
  return (
    <>
      <BeyondwordsSubsection />
      {/* One assistant instance, mounted only on the authenticated Home page. */}
      <VoiceAgent />
    </>
  );
};
