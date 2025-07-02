import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/auth/AuthProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Clients from "./pages/Clients";
import Tasks from "./pages/Tasks";
import Staff from "./pages/Staff";
import EventSheet from "./pages/EventSheet";
import Payments from "./pages/Payments";
import Quotations from "./pages/Quotations";
import Expenses from "./pages/Expenses";
import Finance from "./pages/Finance";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/sheet" element={<EventSheet />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
