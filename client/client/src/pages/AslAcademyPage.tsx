import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/PageTransition';
import { AslLearning } from '@/components/AslLearning';

export const AslAcademyPage = () => {
  const [, navigate] = useLocation();

  return (
    <PageTransition>
      <div className="flex min-h-screen w-full flex-col bg-[#fbf9f5]">
        <nav className="sticky top-0 z-50 flex w-full items-center justify-between bg-[#fbf9f5cc] px-8 py-4 backdrop-blur-md">
          <motion.span
            onClick={() => navigate('/dashboard')}
            whileHover={{ opacity: 0.8 }}
            className="cursor-pointer font-bold tracking-[-1.20px] text-[#102c26] text-2xl [font-family:'Manrope',Helvetica]"
          >
            BeyondWords
          </motion.span>
          <div className="inline-flex gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate('/learning')}
              className="font-medium text-[#414846]"
            >
              Learning Hub
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="rounded-full border-[#102c2620] font-medium text-[#102c26]"
            >
              Dashboard
            </Button>
          </div>
        </nav>

        <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8 sm:py-16">
          <AslLearning />
        </main>
      </div>
    </PageTransition>
  );
};
