import { AboutBeyondwordsSubsection } from "./sections/AboutBeyondwordsSubsection";
import { BeyondwordsMeetingSubsection } from "./sections/BeyondwordsMeetingSubsection";
import { BeyondwordsSubsection } from "./sections/BeyondwordsSubsection";
import { BodySubsection } from "./sections/BodySubsection";
import { MainWrapperSubsection } from "./sections/MainWrapperSubsection";

export const Box = (): JSX.Element => {
  return (
    <div className="relative w-full min-h-screen flex flex-col">
      <BodySubsection />
      <BeyondwordsMeetingSubsection />
      <BeyondwordsSubsection />
      <AboutBeyondwordsSubsection />
      <MainWrapperSubsection />
    </div>
  );
};
