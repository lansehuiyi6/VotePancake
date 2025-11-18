import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { User } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Coins, TrendingUp, FileText, DollarSign, Users, Heart, Plus } from "lucide-react";
import { Link } from "wouter";

interface User {
  id: string;
  username: string;
  role: string;
  xpBalance: string;
  wanBalance: string;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: string;
  creatorId: string;
  creator?: {
    id: string;
    username: string;
  };
  fundingAmount?: string;
  stakeAmount?: string;
  stakeType?: string;
  totalPartnerStake?: string;
  partnerCount?: number;
  alreadySupported?: boolean;
}

interface PartnerSupport {
  id: string;
  proposalId: string;
  partnerId: string;
  wanAmount: string;
  actionType: 'support' | 'burn';
  processed: boolean;
  createdAt: string;
  proposal?: Proposal | null;
}

export default function PartnerDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: currentUser } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    retry: false
  });

  // Handle user changes and refetch data
  useEffect(() => {
    if (currentUser) {
      console.log(`[DEBUG] Current user changed to:`, currentUser.username);
      // Invalidate and refetch data when user changes
      queryClient.invalidateQueries({ queryKey: ['partner-supports'] });
      queryClient.invalidateQueries({ queryKey: ['available-proposals'] });
    }
  }, [currentUser, queryClient]);

  const { 
    data: mySupportsData = [], 
    isLoading: isLoadingSupports, 
    error: supportsError,
    refetch: refetchSupports
  } = useQuery<PartnerSupport[]>({
    queryKey: ['partner-supports', currentUser?.id], // Include user ID in query key
    queryFn: async (): Promise<PartnerSupport[]> => {
      if (!currentUser) {
        console.log('[DEBUG] No current user, returning empty array');
        return [];
      }
      
      console.log(`[DEBUG] Fetching partner supports for user:`, currentUser.username);
      
      try {
        const response = await fetch('/api/partner/supports', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          console.error('[ERROR] Failed to fetch supports:', error);
          throw new Error(error.message || 'Failed to fetch supports');
        }
        
        const data = await response.json();
        console.log(`[DEBUG] Found ${data.length} support records for user`);
        if (data.length > 0) {
          console.log('[DEBUG] First support record:', JSON.stringify(data[0], null, 2));
        }
        
        // Ensure data is an array and has the expected structure
        const supports = Array.isArray(data) ? data : [];
        console.log(`[DEBUG] Found ${supports.length} supports`);
        
        if (supports.length > 0) {
          console.log('[DEBUG] First support item:', JSON.stringify(supports[0], null, 2));
        } else {
          console.log('[DEBUG] No support records found for user');
        }
        
        return supports.map(support => {
          const proposal = support.proposal ? {
            id: support.proposal.id || support.proposalId,
            title: support.proposal.title || 'Untitled Proposal',
            description: support.proposal.description || 'No description available',
            status: support.proposal.status || 'unknown',
            creatorId: support.proposal.creatorId || support.proposal.creator?.id,
            creator: support.proposal.creator?.username || 'Unknown',
            // Include other fields if they exist
            ...(support.proposal.fundingAmount && { fundingAmount: support.proposal.fundingAmount }),
            ...(support.proposal.stakeAmount && { stakeAmount: support.proposal.stakeAmount }),
            ...(support.proposal.stakeType && { stakeType: support.proposal.stakeType })
          } : {
            id: support.proposalId,
            title: 'Unknown Proposal',
            description: 'Proposal details not available',
            status: 'unknown',
            creator: 'Unknown'
          };

          const transformed: PartnerSupport = {
            id: support.id,
            proposalId: support.proposalId,
            partnerId: support.partnerId,
            wanAmount: support.wanAmount,
            actionType: support.actionType,
            processed: support.processed,
            createdAt: support.createdAt || new Date().toISOString(),
            proposal: proposal
          };
          
          console.log('[DEBUG] Transformed support:', JSON.stringify(transformed, null, 2));
          return transformed;
        });
      } catch (error) {
        console.error('[ERROR] Error in partner supports query:', error);
        throw error;
      }
    },
    enabled: !!currentUser, // Only run query if user is logged in
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  });
  
  // Ensure mySupports is always an array
  const mySupports = Array.isArray(mySupportsData) ? mySupportsData : [];
  console.log(`[DEBUG] mySupports (${mySupports.length}):`, mySupports);

  const { 
    data: availableProposals = [], 
    isLoading: isLoadingProposals, 
    error: proposalsError 
  } = useQuery<Proposal[]>({
    queryKey: ['available-proposals'],
    queryFn: async () => {
      if (!currentUser) return [];
      
      try {
        const response = await fetch('/api/partner/available-proposals', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || 'Failed to fetch available proposals');
        }
        
        const data = await response.json();
        console.log('Fetched available proposals:', data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching available proposals:', error);
        throw error;
      }
    },
    enabled: !!currentUser, // Only run query if user is logged in
  });
  
  const isLoading = isLoadingSupports || isLoadingProposals;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>登录 Required</CardTitle>
            <CardDescription>请先登录以查看支持功能</CardDescription>
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

  const totalStaked = mySupports.reduce((sum: number, s: PartnerSupport) => sum + Number(s.wanAmount || 0), 0);
  const activeSupports = mySupports.filter((s: PartnerSupport) => 
    s.proposal?.status === "active" || s.proposal?.status === "approved"
  ).length;
  const passedSupports = mySupports.filter((s: PartnerSupport) => 
    s.proposal?.status === "passed"
  ).length;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">社区支持中心</h1>
              <p className="text-muted-foreground">支持您感兴趣的提案，共同建设更好的社区</p>
            </div>
            <Link href="/create-proposal">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> 创建新提案
              </Button>
            </Link>
          </div>
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
              可支持的项目
            </TabsTrigger>
            <TabsTrigger value="supported" className="gap-2">
              <Users className="h-4 w-4" />
              我的支持
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            <Card>
              <CardHeader>
                <CardTitle>Funding Proposals Seeking Partners</CardTitle>
                <CardDescription>Support proposals and help the community grow</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingProposals ? (
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
                {supportsError ? (
                  <div className="text-center py-8">
                    <div className="text-destructive mb-2">
                      Failed to load support data. Please try again later.
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => refetchSupports()}
                      className="mt-2"
                    >
                      Retry
                    </Button>
                  </div>
                ) : mySupports.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mb-4 flex justify-center">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2">No supports yet</h3>
                    <p className="text-muted-foreground">
                      You haven't supported any proposals yet. Check out the "Available to Support" tab to get started.
                    </p>
                  </div>
                ) : (
                  mySupports.map((support: PartnerSupport) => (
                    <Card key={support.id} className="hover-elevate transition-all duration-200" data-testid={`card-support-${support.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <StatusBadge status={support.proposal?.status || 'unknown'} />
                              <Badge variant={support.actionType === "burn" ? "destructive" : "secondary"}>
                                {support.actionType || 'support'}
                              </Badge>
                              {support.processed && (
                                <Badge variant="outline">Processed</Badge>
                              )}
                            </div>
                            <h3 className="text-lg font-bold mb-1">
                              {support.proposal?.title || 'Untitled Proposal'}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {support.proposal?.description || 'No description available'}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Supported: {new Date(support.createdAt).toLocaleDateString()}</span>
                              {support.proposal?.creator && (
                                <span>Creator: {typeof support.proposal.creator === 'string' 
                                  ? support.proposal.creator 
                                  : support.proposal.creator.username}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <div className="text-right">
                              <div className="text-xl font-bold font-mono text-primary">
                                {Number(support.wanAmount || 0).toLocaleString()}
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
                  ))
                )}
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
