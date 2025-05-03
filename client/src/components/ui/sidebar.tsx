import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Archive,
  ClipboardX,
  WashingMachine,
  Crosshair,
  Slice,
  Combine,
  BadgeCheck,
  Truck,
  Wheat,
  CheckCircle,
  PackageSearch,
  Biohazard,
  SquareCheck,
  Menu,
  PersonStanding,
  HandHelping,
  LogOut
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  onStageSelect?: (stageId: number) => void;
  activeStage?: number | null;
}

interface StageLink {
  id: number;
  title: string;
  icon: React.ReactNode;
  path: string;
}

export function Sidebar({ onStageSelect, activeStage }: SidebarProps) {
  const [location] = useLocation();
  const isMobile = useMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(!isMobile);
  const { user, logout } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isMobile) {
      setIsMenuOpen(true);
    }
  }, [isMobile]);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "An error occurred while logging out.",
        variant: "destructive",
      });
    }
  };

  // Define manufacturing stages
  const stages: StageLink[] = [
    { id: 1, title: "Raw Material Receipt", icon: <ShoppingCart className="h-5 w-5" />, path: "/stage/1" },
    { id: 2, title: "Slug Cutting", icon: <Slice className="h-5 w-5" />, path: "/stage/2" },
    { id: 3, title: "Deburring & Cleaning", icon: <WashingMachine className="h-5 w-5" />, path: "/stage/3" },
    { id: 4, title: "Heating & Forging", icon: <Wheat className="h-5 w-5" />, path: "/stage/4" },
    { id: 5, title: "Trimming", icon: <Slice className="h-5 w-5" />, path: "/stage/5" },
    { id: 6, title: "Fettling", icon: <HandHelping className="h-5 w-5" />, path: "/stage/6" },
    { id: 7, title: "In-Process Inspection", icon: <Crosshair className="h-5 w-5" />, path: "/stage/7" },
    { id: 8, title: "Shot Blasting", icon: <Combine className="h-5 w-5" />, path: "/stage/8" },
    { id: 9, title: "Hardening & Tempering", icon: <ClipboardX className="h-5 w-5" />, path: "/stage/9" },
    { id: 10, title: "Post-Blast Inspection", icon: <PackageSearch className="h-5 w-5" />, path: "/stage/10" },
    { id: 11, title: "Machining (Stage 1)", icon: <Archive className="h-5 w-5" />, path: "/stage/11" },
    { id: 12, title: "Machining (Stage 2)", icon: <Archive className="h-5 w-5" />, path: "/stage/12" },
    { id: 13, title: "Machining (Stage 3)", icon: <Archive className="h-5 w-5" />, path: "/stage/13" },
    { id: 14, title: "Heat Treatment", icon: <ClipboardX className="h-5 w-5" />, path: "/stage/14" },
    { id: 15, title: "Nitrating", icon: <Biohazard className="h-5 w-5" />, path: "/stage/15" },
    { id: 16, title: "Final QC Inspection", icon: <SquareCheck className="h-5 w-5" />, path: "/stage/16" },
    { id: 17, title: "Oiling & Packing", icon: <BadgeCheck className="h-5 w-5" />, path: "/stage/17" },
    { id: 18, title: "Dispatch", icon: <Truck className="h-5 w-5" />, path: "/stage/18" },
  ];

  const handleStageClick = (stageId: number) => {
    if (onStageSelect) {
      onStageSelect(stageId);
    }
    if (isMobile) {
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Mobile menu toggle */}
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-4 z-50"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Sidebar */}
      {isMenuOpen && (
        <div className={cn(
          "w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden h-screen",
          isMobile ? "fixed z-40 left-0 top-0 shadow-xl transition-transform" : "relative"
        )}>
          <div className="flex flex-col h-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-1">Manufacturing Process</h2>
              <p className="text-sm text-sidebar-muted">Tracking System</p>
              
              {user && (
                <div className="mt-4 flex items-center">
                  <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-white font-semibold">
                    {user.name.charAt(0)}
                  </div>
                  <div className="ml-2">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-sidebar-muted">{user.role}</p>
                  </div>
                </div>
              )}
            </div>
            
            <nav className="flex-1 overflow-y-auto py-2">
              <div className="px-3">
                <h3 className="mb-2 px-4 text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
                  Manufacturing Stages
                </h3>
                <div className="space-y-1">
                  {stages.map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => handleStageClick(stage.id)}
                      className={cn(
                        "w-full flex items-center px-4 py-2 text-sm rounded-md transition-colors",
                        activeStage === stage.id
                          ? "bg-primary text-white"
                          : "text-sidebar-foreground hover:bg-sidebar-hover"
                      )}
                    >
                      <span className="mr-3">{stage.icon}</span>
                      <span>{stage.title}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="px-4 py-6">
                <Button 
                  variant="outline"
                  className="w-full text-sidebar-foreground border-sidebar-border flex items-center justify-center gap-2"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}