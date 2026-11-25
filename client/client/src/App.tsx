import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { MeetingPage } from "@/pages/MeetingPage";
import { AboutPage } from "@/pages/AboutPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { EditProfilePage } from "@/pages/EditProfilePage";
import { SchedulePage } from "@/pages/SchedulePage";
import { LearningHubPage } from "@/pages/LearningHubPage";
import { AslAcademyPage } from "@/pages/AslAcademyPage";
import { FeatureDetailPage } from "@/pages/FeatureDetailPage";
import { InfoPage } from "@/pages/InfoPage";
import { LobbyPage } from "@/pages/LobbyPage";
import RoomPage from "@/pages/RoomPage";

import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fbf9f5]">
        <div className="w-8 h-8 border-4 border-[#102c26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        {(params) => <ProtectedRoute component={DashboardPage} params={params} />}
      </Route>
      <Route path="/lobby">
        {(params) => <ProtectedRoute component={LobbyPage} params={params} />}
      </Route>
      <Route path="/room/:roomId">
        {(params) => <ProtectedRoute component={RoomPage} params={params} />}
      </Route>
      <Route path="/profile">
        {(params) => <ProtectedRoute component={ProfilePage} params={params} />}
      </Route>
      <Route path="/schedule">
        {(params) => <ProtectedRoute component={SchedulePage} params={params} />}
      </Route>
      <Route path="/learning">
        {(params) => <ProtectedRoute component={LearningHubPage} params={params} />}
      </Route>
      <Route path="/asl-academy">
        {(params) => <ProtectedRoute component={AslAcademyPage} params={params} />}
      </Route>
      
      {/* Public Routes */}
      <Route path="/about" component={AboutPage} />
      <Route path="/features/:slug" component={FeatureDetailPage} />
      <Route path="/info/:slug" component={InfoPage} />
      <Route component={NotFound} />
    </Switch>
  );
}


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
