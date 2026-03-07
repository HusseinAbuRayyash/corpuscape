import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import bgImage from "@assets/pexels-pixabay-459301_1772765022984.jpg";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Monolingual from "@/pages/monolingual";
import Bilingual from "@/pages/bilingual";
import Scraper from "@/pages/scraper";
import Compare from "@/pages/compare";
import FigureMaker from "@/pages/figure-maker";
import About from "@/pages/about";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/monolingual" component={Monolingual} />
      <Route path="/bilingual" component={Bilingual} />
      <Route path="/scraper" component={Scraper} />
      <Route path="/compare" component={Compare} />
      <Route path="/figures" component={FigureMaker} />
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
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0 relative">
                <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
                  <img src={bgImage} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-background/75 dark:bg-background/80" />
                </div>
                <header className="flex items-center h-12 px-4 border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
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
