import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, TrendingUp, FileText, DollarSign } from "lucide-react";
import { Link } from "wouter";

export default function PartnerDashboard() {
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: mySupports, isLoading } = useQuery<any[]>({
    queryKey: ["/api/partner/supports"],
  });

  if (!currentUser || (currentUser.role !== "partner" && currentUser.role !== "admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You must be a partner to access this page</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalStaked = mySupports?.reduce((sum, s) => sum + Number(s.wanAmount), 0) || 0;
  const activeSupports = mySupports?.filter(s => s.proposal?.status === "active" || s.proposal?.status === "approved").length || 0;
  const passedSupports = mySupports?.filter(s => s.proposal?.status === "passed").length || 0;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Partner Dashboard</h1>
          <p className="text-muted-foreground">Track your proposal support and contributions</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Staked</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{totalStaked.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">WAN committed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Supports</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSupports}</div>
              <p className="text-xs text-muted-foreground mt-1">Ongoing proposals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Successful</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{passedSupports}</div>
              <p className="text-xs text-muted-foreground mt-1">Passed proposals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Supported</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mySupports?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Supported Proposals</CardTitle>
            <CardDescription>Your partnership contributions to community proposals</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : mySupports && mySupports.length > 0 ? (
              <div className="space-y-4">
                {mySupports.map((support: any) => (
                  <Card key={support.id} className="hover-elevate transition-all duration-200" data-testid={`card-support-${support.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <StatusBadge status={support.proposal?.status} />
                            <Badge variant={support.actionType === "burn" ? "destructive" : "secondary"}>
                              {support.actionType}
                            </Badge>
                            {support.processed && (
                              <Badge variant="outline">Processed</Badge>
                            )}
                          </div>
                          <h3 className="text-lg font-bold mb-1">{support.proposal?.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {support.proposal?.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Supported: {new Date(support.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-xl font-bold font-mono text-primary">
                              {Number(support.wanAmount).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">WAN</div>
                          </div>
                          <Link href={`/proposals/${support.proposalId}`}>
                            <Button size="sm" variant="outline" data-testid={`button-view-proposal-${support.id}`}>
                              View Proposal
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mb-4 flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">No supports yet</h3>
                <p className="text-muted-foreground mb-6">
                  Browse funding proposals and provide partnership support to help the community grow.
                </p>
                <Link href="/">
                  <Button>Browse Proposals</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
