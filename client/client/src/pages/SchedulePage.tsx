import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, Users, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/PageTransition";
import { fadeUp, staggerContainer, buttonTap, scaleIn } from "@/lib/animations";

export const SchedulePage = () => {
  const [, navigate] = useLocation();
  const [date, setDate] = useState<Date>();
  const [step, setStep] = useState(1);
  const [time, setTime] = useState("");
  const [participants, setParticipants] = useState("");

  const steps = [
    { id: 1, title: "Time & Date", icon: CalendarIcon },
    { id: 2, title: "Participants", icon: Users },
    { id: 3, title: "Linguistic Layers", icon: Globe }
  ];

  const handleComplete = () => {
    navigate("/dashboard");
  };

  return (
    <PageTransition>
      <div className="flex flex-col w-full min-h-screen bg-[#fbf9f5]">
        <nav className="flex w-full items-center justify-between px-8 py-4 bg-[#fbf9f5cc] backdrop-blur-md sticky top-0 z-50">
          <motion.span 
            onClick={() => navigate("/dashboard")}
            whileHover={{ opacity: 0.8 }}
            className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-2xl tracking-[-1.20px] cursor-pointer"
          >
            BeyondWords
          </motion.span>
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard")}
            className="text-[#414846] font-medium"
          >
            Cancel
          </Button>
        </nav>

        <main className="w-full max-w-2xl mx-auto px-8 py-16">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-12"
          >
            {/* Step Indicator */}
            <div className="flex items-center justify-between">
              {steps.map((s, i) => (
                <div key={s.id} className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 border-[#102c261a]",
                    step >= s.id ? "bg-[#102c26] text-white border-transparent" : "bg-transparent text-[#685d4a]"
                  )}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    "text-sm font-bold tracking-tight uppercase",
                    step >= s.id ? "text-[#102c26]" : "text-[#685d4a] opacity-40"
                  )}>{s.title}</span>
                  {i < steps.length - 1 && <div className="w-12 h-0.5 bg-[#102c260d]" />}
                </div>
              ))}
            </div>

            <section className="bg-white p-10 rounded-2xl shadow-xl border-none">
              {step === 1 && (
                <motion.div variants={fadeUp} className="flex flex-col gap-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-bold text-[#102c26] tracking-tight">Select your timing</h2>
                    <p className="text-[#685d4a] text-sm opacity-80 uppercase tracking-widest">STEP 01/03</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-3">
                      <Label className="text-[#102c26] font-bold tracking-tight text-xs uppercase">DATE</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full h-14 justify-start text-left font-normal bg-[#f5f3ef] border-transparent rounded-xl px-6",
                              !date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex flex-col gap-3">
                      <Label className="text-[#102c26] font-bold tracking-tight text-xs uppercase">TIME</Label>
                      <div className="relative">
                        <Input 
                          placeholder="Select time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="bg-[#f5f3ef] border-transparent h-14 rounded-xl px-6"
                        />
                        <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-[#102c2633] w-5 h-5 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-8 flex justify-end">
                    <Button 
                      onClick={() => setStep(2)}
                      className="bg-[#102c26] text-white hover:bg-[#1a3d35] px-12 py-7 h-auto rounded-xl shadow-lg font-bold"
                    >
                      Next Step
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div variants={fadeUp} className="flex flex-col gap-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-bold text-[#102c26] tracking-tight">Invite Dialogue</h2>
                    <p className="text-[#685d4a] text-sm opacity-80 uppercase tracking-widest">STEP 02/03</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <Label className="text-[#102c26] font-bold tracking-tight text-xs uppercase">PARTICIPANT EMAIL ADDRESSES</Label>
                    <Input 
                      placeholder="curator@beyondwords.it, colleague@domain.com..."
                      value={participants}
                      onChange={(e) => setParticipants(e.target.value)}
                      className="bg-[#f5f3ef] border-transparent h-14 rounded-xl px-6"
                    />
                  </div>

                  <div className="pt-8 flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(1)} className="text-[#685d4a] px-8">Back</Button>
                    <Button 
                      onClick={() => setStep(3)}
                      className="bg-[#102c26] text-white hover:bg-[#1a3d35] px-12 py-7 h-auto rounded-xl shadow-lg font-bold"
                    >
                      Next Step
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div variants={fadeUp} className="flex flex-col gap-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-bold text-[#102c26] tracking-tight">Linguistic Layers</h2>
                    <p className="text-[#685d4a] text-sm opacity-80 uppercase tracking-widest">STEP 03/03</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: 'trans', title: 'Live Translation', desc: 'Real-time subtitles for all' },
                      { id: 'sl', title: 'Sign Language', desc: 'AI-driven visual interpretation' },
                      { id: 'context', title: 'Contextual Depth', desc: 'Tone & emotion preservation' },
                      { id: 'archive', title: 'Linguistic Archive', desc: 'Smart transcription' }
                    ].map((opt) => (
                      <Card key={opt.id} className="bg-[#fbf9f5] border-transparent rounded-xl hover:bg-[#102c260d] cursor-pointer transition-colors p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-5 h-5 rounded-full border-2 border-[#102c261a]" />
                          <div className="flex flex-col">
                            <span className="font-bold text-[#102c26] text-sm">{opt.title}</span>
                            <span className="text-xs text-[#685d4a] opacity-80">{opt.desc}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="pt-8 flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(2)} className="text-[#685d4a] px-8">Back</Button>
                    <Button 
                      onClick={handleComplete}
                      className="bg-[#102c26] text-white hover:bg-[#1a3d35] px-12 py-7 h-auto rounded-xl shadow-lg font-bold"
                    >
                      Confirm Meeting
                    </Button>
                  </div>
                </motion.div>
              )}
            </section>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
};
