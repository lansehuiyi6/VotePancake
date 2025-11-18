import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { useQuery } from "@tanstack/react-query";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import CreateProposal from "@/pages/create-proposal";
import ProposalDetail from "@/pages/proposal-detail";
import MyProposals from "@/pages/my-proposals";
import AdminPanel from "@/pages/admin";
import PartnerDashboard from "@/pages/partner-dashboard";
import SupportProposal from "@/pages/support-proposal";
import NotFound from "@/pages/not-found";

function Router() {
  const { data: currentUser, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/me"],
    retry: false,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header currentUser={currentUser} />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/proposals/create" component={CreateProposal} />
        <Route path="/proposals/:id/support" component={SupportProposal} />
        <Route path="/proposals/:id" component={ProposalDetail} />
        <Route path="/my-proposals" component={MyProposals} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/partner" component={PartnerDashboard} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
