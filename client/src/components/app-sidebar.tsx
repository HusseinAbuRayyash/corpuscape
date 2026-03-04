import { useLocation, Link } from "wouter";
import { Home, BookOpen, Globe, Brain, Sun, Moon, Newspaper } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import traduxaLogo from "@assets/image_1772608193211.png";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Monolingual", url: "/monolingual", icon: BookOpen },
  { title: "Bilingual", url: "/bilingual", icon: Globe },
  { title: "AI Insights", url: "/ai-insights", icon: Brain },
  { title: "Web Scraper", url: "/scraper", icon: Newspaper },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar>
      <SidebarContent>
        <div className="px-4 py-5">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer group" data-testid="link-home-logo">
              <img src={traduxaLogo} alt="Traduxa" className="w-[110px] h-auto transition-transform duration-300 group-hover:scale-105 mix-blend-multiply dark:mix-blend-screen dark:invert" />
            </div>
          </Link>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/30 font-semibold">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                    className="data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium transition-all duration-200"
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 pb-3 space-y-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleTheme}
            className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
            data-testid="button-theme-toggle"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
