import { Link, useLocation } from "wouter";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Coins, Zap, User, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  currentUser?: {
    id: string;
    username: string;
    role: string;
    xpBalance: string;
    wanBalance: string;
  } | null;
}

export function Header({ currentUser }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "partner":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/">
            <button className="flex items-center gap-2 hover-elevate rounded-md px-3 py-2 -ml-3 bg-transparent border-0 cursor-pointer" data-testid="link-home">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
                <Coins className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                WAN Governance
              </span>
            </button>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <>
              <div className="hidden sm:flex items-center gap-2 mr-2">
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-card border border-card-border">
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="text-sm font-mono font-semibold">{Number(currentUser.xpBalance).toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">XP</span>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-card border border-card-border">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="text-sm font-mono font-semibold">{Number(currentUser.wanBalance).toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">WAN</span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2" data-testid="button-user-menu">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentUser.username}</span>
                    <Badge variant={getRoleBadgeVariant(currentUser.role)} className="hidden sm:inline-flex">
                      {currentUser.role}
                    </Badge>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="sm:hidden px-2 py-1.5 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground">XP:</span>
                      <span className="font-mono font-semibold">{Number(currentUser.xpBalance).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">WAN:</span>
                      <span className="font-mono font-semibold">{Number(currentUser.wanBalance).toLocaleString()}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="sm:hidden" />
                  {currentUser.role === "admin" && (
                    <Link href="/admin">
                      <DropdownMenuItem data-testid="link-admin">Admin Panel</DropdownMenuItem>
                    </Link>
                  )}
                  {(currentUser.role === "partner" || currentUser.role === "admin") && (
                    <Link href="/partner">
                      <DropdownMenuItem data-testid="link-partner">Partner Dashboard</DropdownMenuItem>
                    </Link>
                  )}
                  <Link href="/my-proposals">
                    <DropdownMenuItem data-testid="link-my-proposals">My Proposals</DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" data-testid="button-login">Login</Button>
              </Link>
              <Link href="/register">
                <Button data-testid="button-register">Register</Button>
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
