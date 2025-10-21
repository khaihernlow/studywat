import { Bot, Blocks, School } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLocation } from "react-router-dom";
import { NavUser } from "./NavUser";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";

const items = [
  {
    title: "Chat Advisor",
    url: "/chat",
    icon: Bot,
  },
  {
    title: "Profile",
    url: "/profile",
    icon: Blocks,
  },
  {
    title: "University Search",
    url: "/university",
    icon: School,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();

  // Helper to handle menu click
  const handleMenuClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  // Close sidebar on route change (mobile only, with delay to avoid flicker)
  React.useEffect(() => {
    if (isMobile) {
      const timeout = setTimeout(() => setOpenMobile(false), 100);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isMobile]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link to="#" onClick={handleMenuClick}>
                <img 
                  src="https://vialing.com/wp-content/uploads/vialing-squares.webp" 
                  alt="Vialing Logo" 
                  className="!size-5 rounded-xs"
                />
                <span className="text-base font-semibold">Studywat by Vialing</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url} className="flex items-center gap-2" onClick={handleMenuClick}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {user && (
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      )}
    </Sidebar>
  );
} 