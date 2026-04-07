import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/animations";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const footerLinks = [{ label: "PRIVACY" }, { label: "TERMS" }, { label: "HELP" }];

export const MainWrapperSubsection = (): JSX.Element => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [, navigate] = useLocation();
  const { login, register, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef(null);
  const formInView = useInView(formRef, { once: true, margin: "-40px" });

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Simulate Google Profile
      const googleProfile = {
        userName: "Google Explorer",
        email: "google.user@example.com"
      };

      const result = await loginWithGoogle(googleProfile.userName, googleProfile.email);

      if (result.success) {
        toast({
          title: "Connected with Google",
          description: "Welcome to BeyondWords!",
        });
        navigate("/dashboard");
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      toast({
        title: "Google Auth Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;
      if (isSignUp) {
        result = await register(fullName, email, password);
      } else {
        result = await login(email, password);
      }

      if (result.success) {
        toast({
          title: "Success",
          description: isSignUp ? "Account created successfully" : "Logged in successfully",
        });
        navigate("/dashboard");
      } else {
        throw new Error(result.message || 'Authentication failed');
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-[#fbf9f5]">
      <div className="flex w-full min-h-screen items-stretch">
        {/* Left decorative panel */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col flex-1 items-center justify-center p-16 relative bg-[#eddec5] overflow-hidden min-h-screen"
        >
          <img
            className="absolute w-full h-full top-0 left-0 object-cover pointer-events-none"
            alt="Decorative grain"
            src="/figmaAssets/decorative-grain-texture-overlay.png"
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1], x: [0, 20, 0], y: [0, -15, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-20 -bottom-20 w-96 h-96 bg-[#e4e2de4c] rounded-full blur-[32px] pointer-events-none"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], x: [0, -15, 0], y: [0, 20, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="absolute top-10 right-10 w-64 h-64 bg-[#102c260d] rounded-full blur-[20px] pointer-events-none"
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col max-w-2xl items-start gap-12 relative z-10 w-full"
          >
            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center gap-[16.5px] w-full"
            >
              <span className="[font-family:'Manrope',Helvetica] font-normal text-[#685d4a] text-sm text-center tracking-[2.80px] leading-5 whitespace-nowrap">
                A GLOBAL DIALOGUE
              </span>
              <motion.h1
                onClick={() => navigate("/")}
                whileHover={{ opacity: 0.8 }}
                className="[font-family:'Manrope',Helvetica] font-normal text-[#102c26] text-7xl text-center tracking-[-3.60px] leading-[72px] whitespace-nowrap cursor-pointer"
              >
                BeyondWords
              </motion.h1>
            </motion.div>

            <motion.div variants={scaleIn} className="flex flex-col items-start justify-center w-full">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="w-full h-[480px] bg-[url(/figmaAssets/editorial-illustration-of-diverse-people-speaking.png)] bg-cover bg-[50%_50%] rounded-sm"
              />
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col items-center w-full">
              <p className="[font-family:'Manrope',Helvetica] font-light text-[#102c26] text-3xl text-center tracking-[0] leading-9 w-full">
                &quot;Connecting not just people but also the
                <br />
                languages&quot;
              </p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Right login panel */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col w-[512px] shrink-0 items-center justify-center p-20 relative bg-[#fbf9f5] min-h-screen"
        >
          <motion.div
            ref={formRef}
            variants={staggerContainer}
            initial="hidden"
            animate={formInView ? "visible" : "hidden"}
            className="flex flex-col max-w-md items-start gap-10 w-full"
          >
            <motion.div variants={fadeUp} className="flex flex-col items-start gap-2 w-full">
              <h2 className="[font-family:'Manrope',Helvetica] font-bold text-[#001712] text-3xl tracking-[-0.75px] leading-9 w-full">
                {isSignUp ? "Create Account" : "Welcome back"}
              </h2>
              <p className="[font-family:'Manrope',Helvetica] font-medium text-[#414846] text-base tracking-[0] leading-6 w-full">
                {isSignUp 
                  ? "Join our global collective of curated voices." 
                  : "Please enter your details to continue your journey."}
              </p>
            </motion.div>

            <motion.div variants={staggerContainer} className="flex flex-col items-start gap-4 w-full">
              {/* Google sign in */}
              <motion.div variants={fadeUp} whileHover={{ scale: 1.02 }} className="w-full">
                <Button
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="flex justify-center gap-3 px-6 py-3.5 w-full h-auto bg-white rounded-lg border border-solid border-[#c1c8c54c] shadow-[0px_1px_2px_#0000000d] items-center hover:bg-gray-50"
                >
                  <img className="w-5 h-5" alt="Google" src="/figmaAssets/svg.svg" />
                  <span className="[font-family:'Manrope',Helvetica] font-normal text-[#1b1c1a] text-base text-center tracking-[0] leading-6 whitespace-nowrap">
                    {isLoading ? "Connecting..." : (isSignUp ? "Sign up with Google" : "Continue with Google")}
                  </span>
                </Button>
              </motion.div>

              {/* OR divider */}
              <motion.div variants={fadeUp} className="flex items-center px-0 py-4 w-full">
                <Separator className="flex-1 bg-[#c1c8c533]" />
                <div className="px-4">
                  <span className="[font-family:'Manrope',Helvetica] font-normal text-[#727976] text-xs tracking-[1.20px] leading-4 whitespace-nowrap">
                    OR
                  </span>
                </div>
                <Separator className="flex-1 bg-[#c1c8c533]" />
              </motion.div>

              <motion.div variants={staggerContainer} className="flex flex-col items-start gap-6 w-full">
                {isSignUp && (
                  <motion.div variants={fadeUp} className="flex flex-col items-start gap-1.5 w-full">
                    <label className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-xs tracking-[1.20px] leading-4 whitespace-nowrap">
                      FULL NAME
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="px-4 py-[17px] w-full h-auto bg-[#f5f3ef] rounded-lg overflow-hidden border-none focus-visible:ring-1 focus-visible:ring-[#102c2633] [font-family:'Manrope',Helvetica] font-normal text-[#102c26] text-base tracking-[0] leading-normal"
                    />
                  </motion.div>
                )}
                
                {/* Email field */}
                <motion.div variants={fadeUp} className="flex flex-col items-start gap-1.5 w-full">
                  <label className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-xs tracking-[1.20px] leading-4 whitespace-nowrap">
                    EMAIL ADDRESS
                  </label>
                  <Input
                    type="email"
                    placeholder="curator@beyondwords.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="px-4 py-[17px] w-full h-auto bg-[#f5f3ef] rounded-lg overflow-hidden border-none focus-visible:ring-1 focus-visible:ring-[#102c2633] [font-family:'Manrope',Helvetica] font-normal text-[#102c26] text-base tracking-[0] leading-normal"
                  />
                </motion.div>

                {/* Password field */}
                <motion.div variants={fadeUp} className="flex flex-col items-start gap-1.5 w-full">
                  <div className="flex items-center justify-between w-full">
                    <label className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-xs tracking-[1.20px] leading-4 whitespace-nowrap">
                      PASSWORD
                    </label>
                    {!isSignUp && (
                      <motion.button
                        whileHover={{ color: "#102c26" }}
                        type="button"
                        className="[font-family:'Manrope',Helvetica] font-normal text-[#685d4a] text-xs tracking-[1.20px] leading-4 whitespace-nowrap cursor-pointer bg-transparent border-none p-0"
                      >
                        Forgot?
                      </motion.button>
                    )}
                  </div>
                  <motion.div
                    whileHover={{ boxShadow: "0 0 0 2px rgba(104,93,74,0.3)" }}
                    className="relative w-full"
                  >
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="px-4 py-[17px] w-full h-auto bg-[#f5f3ef] rounded-lg overflow-hidden border-none focus-visible:ring-1 focus-visible:ring-[#102c2633] [font-family:'Manrope',Helvetica] font-normal text-[#102c26] text-base tracking-[0] leading-normal pr-12"
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 -translate-y-1/2 right-4 w-[22px] flex items-center justify-center bg-transparent border-none p-0 cursor-pointer z-10"
                    >
                      <img className="w-[22px]" alt="Toggle visibility" src="/figmaAssets/container-4.svg" />
                    </motion.button>
                  </motion.div>
                </motion.div>

                {/* Main Action Button */}
                <motion.div
                  variants={fadeUp}
                  className="w-full"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="relative flex justify-center px-0 py-4 w-full h-auto bg-[#102c26] rounded-lg items-center hover:bg-[#1a4a3a] overflow-hidden"
                  >
                    <div className="shadow-[0px_8px_10px_-6px_#102c261a,0px_20px_25px_-5px_#102c261a] absolute w-full h-full top-0 left-0 bg-[#ffffff01] rounded-lg pointer-events-none" />
                    <span className="relative [font-family:'Manrope',Helvetica] font-bold text-white text-base text-center tracking-[0] leading-6 whitespace-nowrap">
                      {isLoading ? "Please wait..." : (isSignUp ? "Create Account" : "Sign In")}
                    </span>
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Toggle between Sign In and Sign Up */}
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-1 w-full">
              <span className="[font-family:'Manrope',Helvetica] font-medium text-[#414846] text-sm text-center tracking-[0] leading-5 whitespace-nowrap">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}
              </span>
              <motion.button
                onClick={() => setIsSignUp(!isSignUp)}
                whileHover={{ color: "#685d4a" }}
                type="button"
                className="[font-family:'Manrope',Helvetica] font-bold text-[#001712] text-sm text-center tracking-[0] leading-5 whitespace-nowrap bg-transparent border-none p-0 cursor-pointer"
              >
                {isSignUp ? "Sign In" : "Create Account"}
              </motion.button>
            </motion.div>
          </motion.div>

          <footer className="flex items-center gap-[27.2px] pt-[6.5px] pb-[2.5px] absolute left-20 bottom-8">
            {footerLinks.map((link) => (
              <motion.button
                key={link.label}
                whileHover={{ color: "#414846", y: -1 }}
                type="button"
                className="[font-family:'Manrope',Helvetica] font-normal text-[#727976] text-[10px] tracking-[2.00px] leading-[15px] whitespace-nowrap bg-transparent border-none p-0 cursor-pointer"
              >
                {link.label}
              </motion.button>
            ))}
          </footer>
        </motion.div>
      </div>
    </div>
  );
};
