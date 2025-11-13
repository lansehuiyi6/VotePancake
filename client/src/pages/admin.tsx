import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle, DollarSign, User, Settings } from "lucide-react";
import { Link } from "wouter";

export default function AdminPanel() {
  const { toast } = useToast();

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: pendingProposals } = useQuery<any[]>({
    queryKey: ["/api/admin/pending"],
  });

  const { data: params } = useQuery<any>({
    queryKey: ["/api/system/params"],
  });

  const approveMutation = useMutation({
    mutationFn: (proposalId: string) => apiRequest("POST", `/api/admin/proposals/${proposalId}/approve`, {}),
    onSuccess: () => {
      toast({
        title: "Proposal approved",
        description: "The proposal has been made public and is ready for voting.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending"] });
    },
    onError: (error: any) => {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (proposalId: string) => apiRequest("POST", `/api/admin/proposals/${proposalId}/reject`, {}),
    onSuccess: () => {
      toast({
        title: "Proposal rejected",
        description: "The proposal has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending"] });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateParamMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => 
      apiRequest("PUT", `/api/admin/params/${key}`, { value }),
    onSuccess: () => {
      toast({
        title: "Parameter updated",
        description: "System parameter has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/system/params"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You must be an administrator to access this page</CardDescription>
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

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">Manage proposals and system parameters</p>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending Review
              {pendingProposals && pendingProposals.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingProposals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="h-4 w-4 mr-2" />
              System Parameters
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-6">
            {pendingProposals && pendingProposals.length > 0 ? (
              <div className="space-y-4">
                {pendingProposals.map((proposal: any) => (
                  <Card key={proposal.id} data-testid={`card-pending-${proposal.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <StatusBadge status={proposal.status} />
                            {proposal.type === "funding" && (
                              <Badge variant="secondary">
                                <DollarSign className="h-3 w-3 mr-1" />
                                Funding Request
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl mb-2">{proposal.title}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{proposal.creator?.username}</span>
                            <Separator orientation="vertical" className="h-4" />
                            <span>{new Date(proposal.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground line-clamp-3">{proposal.description}</p>

                      {proposal.type === "funding" && (
                        <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Requesting</div>
                            <div className="text-xl font-bold font-mono text-primary">
                              {Number(proposal.fundingAmount).toLocaleString()} WAN
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Proposer Stake</div>
                            <div className="text-lg font-bold font-mono">
                              {Number(proposal.stakeAmount).toLocaleString()} WAN ({proposal.stakeType})
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        <Link href={`/proposals/${proposal.id}`}>
                          <Button variant="outline" data-testid={`button-view-${proposal.id}`}>
                            View Full Details
                          </Button>
                        </Link>
                        <Button
                          variant="default"
                          onClick={() => approveMutation.mutate(proposal.id)}
                          disabled={approveMutation.isPending}
                          className="gap-2"
                          data-testid={`button-approve-${proposal.id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve & Publish
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => rejectMutation.mutate(proposal.id)}
                          disabled={rejectMutation.isPending}
                          className="gap-2"
                          data-testid={`button-reject-${proposal.id}`}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">No proposals pending review at the moment.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Parameters</CardTitle>
                <CardDescription>Adjust governance system parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="xpBurnCost">XP Burn Cost</Label>
                    <div className="flex gap-2">
                      <Input
                        id="xpBurnCost"
                        type="number"
                        defaultValue={params?.xpBurnCost || "110000"}
                        data-testid="input-xp-burn-cost"
                      />
                      <Button
                        onClick={() => {
                          const input = document.getElementById("xpBurnCost") as HTMLInputElement;
                          updateParamMutation.mutate({ key: "xpBurnCost", value: input.value });
                        }}
                        data-testid="button-update-xp-burn-cost"
                      >
                        Update
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      XP required to create a proposal (waived for admins)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lockMultiplier">Lock Multiplier</Label>
                    <div className="flex gap-2">
                      <Input
                        id="lockMultiplier"
                        type="number"
                        defaultValue={params?.lockMultiplier || "10"}
                        data-testid="input-lock-multiplier"
                      />
                      <Button
                        onClick={() => {
                          const input = document.getElementById("lockMultiplier") as HTMLInputElement;
                          updateParamMutation.mutate({ key: "lockMultiplier", value: input.value });
                        }}
                        data-testid="button-update-lock-multiplier"
                      >
                        Update
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Funding multiplier for locked WAN stakes
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="burnMultiplier">Burn Multiplier</Label>
                    <div className="flex gap-2">
                      <Input
                        id="burnMultiplier"
                        type="number"
                        defaultValue={params?.burnMultiplier || "50"}
                        data-testid="input-burn-multiplier"
                      />
                      <Button
                        onClick={() => {
                          const input = document.getElementById("burnMultiplier") as HTMLInputElement;
                          updateParamMutation.mutate({ key: "burnMultiplier", value: input.value });
                        }}
                        data-testid="button-update-burn-multiplier"
                      >
                        Update
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Funding multiplier for burned WAN stakes
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="votingDuration">Voting Duration (days)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="votingDuration"
                        type="number"
                        defaultValue={params?.votingDuration || "14"}
                        data-testid="input-voting-duration"
                      />
                      <Button
                        onClick={() => {
                          const input = document.getElementById("votingDuration") as HTMLInputElement;
                          updateParamMutation.mutate({ key: "votingDuration", value: input.value });
                        }}
                        data-testid="button-update-voting-duration"
                      >
                        Update
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Duration of voting period for proposals
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lockDuration">Lock Duration (months)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="lockDuration"
                        type="number"
                        defaultValue={params?.lockDuration || "12"}
                        data-testid="input-lock-duration"
                      />
                      <Button
                        onClick={() => {
                          const input = document.getElementById("lockDuration") as HTMLInputElement;
                          updateParamMutation.mutate({ key: "lockDuration", value: input.value });
                        }}
                        data-testid="button-update-lock-duration"
                      >
                        Update
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Lock duration for passed proposals
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
