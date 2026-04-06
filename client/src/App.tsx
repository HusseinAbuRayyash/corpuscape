import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Monolingual from "@/pages/monolingual";
import Bilingual from "@/pages/bilingual";
import Scraper from "@/pages/scraper";
import Compare from "@/pages/compare";
import FigureMaker from "@/pages/figure-maker";
import About from "@/pages/about";
import Library from "@/pages/library";

const SIDEBAR_LS_KEY = "corpuscape_sidebar_open";

function readSidebarOpen(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_LS_KEY);
    if (stored === null) return true;
    return stored === "true";
  } catch {
    return true;
  }
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/monolingual" component={Monolingual} />
      <Route path="/bilingual" component={Bilingual} />
      <Route path="/scraper" component={Scraper} />
      <Route path="/compare" component={Compare} />
      <Route path="/figures" component={FigureMaker} />
      <Route path="/library" component={Library} />
      <Route path="/about" component={About} />
      <Route component={NotFound} />
    </Switch>
  );
}

const sidebarStyle = {
  "--sidebar-width": "15rem",
  "--sidebar-width-icon": "3rem",
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(readSidebarOpen);

  function handleSidebarChange(open: boolean) {
    setSidebarOpen(open);
    try {
      localStorage.setItem(SIDEBAR_LS_KEY, String(open));
    } catch {
    }
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider
            defaultOpen={sidebarOpen}
            onOpenChange={handleSidebarChange}
            style={sidebarStyle as React.CSSProperties}
          >
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0 relative">
                <header className="flex items-center h-12 px-4 border-b border-border/60 bg-background/90 backdrop-blur-xl sticky top-0 z-50">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                </header>
                <main className="flex-1 overflow-auto relative z-[1]">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
