import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, TrendingUp, FileText, DollarSign, Users, Heart } from "lucide-react";
import { Link } from "wouter";

export default function PartnerDashboard() {
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: mySupports, isLoading } = useQuery<any[]>({
    queryKey: ["/api/partner/supports"],
  });

  const { data: availableProposals, isLoading: loadingAvailable } = useQuery<any[]>({
    queryKey: ["/api/partner/available-proposals"],
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>登录required</CardTitle>
            <CardDescription>请先登录以查看 Partner 支持功能</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button>前往登录</Button>
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

        <Tabs defaultValue="available" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="available" className="gap-2">
              <Heart className="h-4 w-4" />
              Available to Support
            </TabsTrigger>
            <TabsTrigger value="supported" className="gap-2">
              <Users className="h-4 w-4" />
              My Supports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            <Card>
              <CardHeader>
                <CardTitle>Funding Proposals Seeking Partners</CardTitle>
                <CardDescription>Support proposals and help the community grow</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAvailable ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : availableProposals && availableProposals.length > 0 ? (
                  <div className="space-y-4">
                    {availableProposals.map((proposal: any) => (
                      <Card key={proposal.id} className="hover-elevate transition-all duration-200" data-testid={`card-available-${proposal.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <StatusBadge status={proposal.status} />
                                <Badge variant="secondary">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Funding Request
                                </Badge>
                                {proposal.alreadySupported && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    ✓ Supported
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-lg font-bold mb-1">{proposal.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {proposal.description}
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <div className="text-xs text-muted-foreground">Funding Request</div>
                                  <div className="font-mono font-bold text-primary">
                                    {Number(proposal.fundingAmount || 0).toLocaleString()} WAN
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Creator Stake</div>
                                  <div className="font-mono font-semibold">
                                    {Number(proposal.stakeAmount || 0).toLocaleString()} WAN
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Partner Support</div>
                                  <div className="font-mono font-semibold text-green-600">
                                    {Number(proposal.totalPartnerStake || 0).toLocaleString()} WAN
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {proposal.partnerCount} partner{proposal.partnerCount !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              {proposal.alreadySupported ? (
                                <Link href={`/proposals/${proposal.id}`}>
                                  <Button size="sm" variant="outline" data-testid={`button-view-${proposal.id}`}>
                                    查看详情
                                  </Button>
                                </Link>
                              ) : (
                                <Link href={`/proposals/${proposal.id}/support`}>
                                  <Button size="sm" data-testid={`button-support-${proposal.id}`}>
                                    提供支持
                                  </Button>
                                </Link>
                              )}
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
                        <Heart className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2">No proposals available</h3>
                    <p className="text-muted-foreground">
                      There are currently no funding proposals seeking partner support.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="supported">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
