import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import Scan from "@/pages/Scan";
import Suggestions from "@/pages/Suggestions";
import EquipmentList from "@/pages/EquipmentList";
import EquipmentDetail from "@/pages/EquipmentDetail";
import RegisterMachine from "@/pages/RegisterMachine";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Report from "@/pages/Report";
import EmissionsPanel from "@/pages/EmissionsPanel";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/scan" component={Scan} />
        <Route path="/suggestions" component={Suggestions} />
        <Route path="/equipment" component={EquipmentList} />
        <Route path="/equipment/register" component={RegisterMachine} />
        <Route path="/equipment/:id" component={EquipmentDetail} />
        <Route path="/emissions" component={EmissionsPanel} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/chat" component={Chat} />
        <Route path="/reports/:id" component={Report} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
