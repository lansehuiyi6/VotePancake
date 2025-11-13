import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { StatusBadge } from "@/components/status-badge";
import { CountdownTimer } from "@/components/countdown-timer";
import { VoteProgress } from "@/components/vote-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, DollarSign, Coins, ThumbsUp, ThumbsDown, Users, Lock, Flame } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const voteSchema = z.object({
  support: z.boolean(),
  wanAmount: z.string().min(1, "Amount required"),
  lockType: z.enum(["until_end", "6_months", "12_months", "burn"]),
});

const partnerSupportSchema = z.object({
  wanAmount: z.string().min(1, "Amount required"),
  actionType: z.enum(["lock", "burn"]),
});

type VoteFormData = z.infer<typeof voteSchema>;
type PartnerSupportFormData = z.infer<typeof partnerSupportSchema>;

export default function ProposalDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [showVoteForm, setShowVoteForm] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [voteChoice, setVoteChoice] = useState<boolean | null>(null);

  const { data: proposal, isLoading } = useQuery<any>({
    queryKey: [`/api/proposals/${id}`],
  });

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: votes } = useQuery<any[]>({
    queryKey: [`/api/proposals/${id}/votes`],
  });

  const { data: partners } = useQuery<any[]>({
    queryKey: [`/api/proposals/${id}/partners`],
  });

  const voteForm = useForm<VoteFormData>({
    resolver: zodResolver(voteSchema),
    defaultValues: {
      support: true,
      wanAmount: "",
      lockType: "until_end",
    },
  });

  const partnerForm = useForm<PartnerSupportFormData>({
    resolver: zodResolver(partnerSupportSchema),
    defaultValues: {
      wanAmount: "",
      actionType: "lock",
    },
  });

  const voteMutation = useMutation({
    mutationFn: (data: VoteFormData) => apiRequest("POST", `/api/proposals/${id}/vote`, data),
    onSuccess: () => {
      toast({
        title: "Vote submitted!",
        description: "Your vote has been recorded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/proposals/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/proposals/${id}/votes`] });
      setShowVoteForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Vote failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const partnerSupportMutation = useMutation({
    mutationFn: (data: PartnerSupportFormData) => apiRequest("POST", `/api/proposals/${id}/support`, data),
    onSuccess: () => {
      toast({
        title: "Support added!",
        description: "Your partnership support has been recorded.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/proposals/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/proposals/${id}/partners`] });
      setShowPartnerForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Support failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getVoteMultiplier = (lockType: string) => {
    switch (lockType) {
      case "until_end": return 1;
      case "6_months": return 5;
      case "12_months": return 10;
      case "burn": return 25;
      default: return 1;
    }
  };

  const calculateVotingPower = () => {
    const amount = Number(voteForm.watch("wanAmount") || 0);
    const lockType = voteForm.watch("lockType");
    return amount * getVoteMultiplier(lockType);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Proposal Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>Back to Proposals</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasVoted = votes?.some(v => v.voterId === currentUser?.id);
  const hasSupported = partners?.some(p => p.partnerId === currentUser?.id);
  const isCreator = currentUser?.id === proposal.creatorId;
  const isPartner = currentUser?.role === "partner" || currentUser?.role === "admin";

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <a className="text-sm text-muted-foreground hover:text-foreground" data-testid="link-back">
              ← Back to Proposals
            </a>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <StatusBadge status={proposal.status} />
                      {proposal.type === "funding" && (
                        <Badge variant="secondary">
                          <DollarSign className="h-3 w-3 mr-1" />
                          Funding Request
                        </Badge>
                      )}
                    </div>
                    <h1 className="text-3xl font-bold mb-4" data-testid="text-proposal-title">
                      {proposal.title}
                    </h1>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{proposal.creator?.username}</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <span>Created {new Date(proposal.createdAt).toLocaleDateString()}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{proposal.description}</p>
                </div>

                {proposal.type === "funding" && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-4">Funding Details</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-card border border-card-border">
                          <div className="text-sm text-muted-foreground mb-1">Requesting</div>
                          <div className="text-2xl font-bold font-mono text-primary">
                            {Number(proposal.fundingAmount).toLocaleString()} WAN
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-card border border-card-border">
                          <div className="text-sm text-muted-foreground mb-1">Proposer Stake</div>
                          <div className="text-lg font-bold font-mono">
                            {Number(proposal.stakeAmount).toLocaleString()} WAN
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {proposal.stakeType === "lock" ? "Locked" : "Burned"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {partners && partners.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Partner Support ({partners.length})
                          </h3>
                          <div className="space-y-2">
                            {partners.map((partner: any) => (
                              <div key={partner.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-card-border">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{partner.partner?.username}</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-mono font-semibold">{Number(partner.wanAmount).toLocaleString()} WAN</div>
                                  <div className="text-xs text-muted-foreground">{partner.actionType}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {proposal.status === "active" && currentUser && !hasVoted && (
              <Card>
                <CardHeader>
                  <CardTitle>Cast Your Vote</CardTitle>
                </CardHeader>
                <CardContent>
                  {!showVoteForm ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-auto py-6 flex-col gap-2"
                        onClick={() => {
                          setVoteChoice(true);
                          setShowVoteForm(true);
                          voteForm.setValue("support", true);
                        }}
                        data-testid="button-vote-for"
                      >
                        <ThumbsUp className="h-8 w-8 text-success" />
                        <span className="text-lg font-bold">Vote For</span>
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-auto py-6 flex-col gap-2"
                        onClick={() => {
                          setVoteChoice(false);
                          setShowVoteForm(true);
                          voteForm.setValue("support", false);
                        }}
                        data-testid="button-vote-against"
                      >
                        <ThumbsDown className="h-8 w-8 text-destructive" />
                        <span className="text-lg font-bold">Vote Against</span>
                      </Button>
                    </div>
                  ) : (
                    <Form {...voteForm}>
                      <form onSubmit={voteForm.handleSubmit((data) => voteMutation.mutate(data))} className="space-y-4">
                        <Alert>
                          <AlertDescription>
                            Voting <strong>{voteChoice ? "FOR" : "AGAINST"}</strong> this proposal
                          </AlertDescription>
                        </Alert>

                        <FormField
                          control={voteForm.control}
                          name="wanAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>WAN Amount</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Enter WAN amount"
                                  data-testid="input-vote-amount"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Amount of WAN to commit to your vote
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={voteForm.control}
                          name="lockType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lock Period</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  className="grid gap-2"
                                >
                                  <FormItem>
                                    <div className="relative">
                                      <RadioGroupItem value="until_end" id="until_end" className="peer sr-only" />
                                      <label
                                        htmlFor="until_end"
                                        className="flex items-center justify-between rounded-lg border-2 border-muted bg-card p-3 hover-elevate cursor-pointer peer-data-[state=checked]:border-primary"
                                      >
                                        <span>Lock until voting ends</span>
                                        <Badge variant="outline">1x</Badge>
                                      </label>
                                    </div>
                                  </FormItem>
                                  <FormItem>
                                    <div className="relative">
                                      <RadioGroupItem value="6_months" id="6_months" className="peer sr-only" />
                                      <label
                                        htmlFor="6_months"
                                        className="flex items-center justify-between rounded-lg border-2 border-muted bg-card p-3 hover-elevate cursor-pointer peer-data-[state=checked]:border-primary"
                                      >
                                        <span>Lock for 6 months</span>
                                        <Badge variant="outline">5x</Badge>
                                      </label>
                                    </div>
                                  </FormItem>
                                  <FormItem>
                                    <div className="relative">
                                      <RadioGroupItem value="12_months" id="12_months" className="peer sr-only" />
                                      <label
                                        htmlFor="12_months"
                                        className="flex items-center justify-between rounded-lg border-2 border-muted bg-card p-3 hover-elevate cursor-pointer peer-data-[state=checked]:border-primary"
                                      >
                                        <span>Lock for 12 months</span>
                                        <Badge variant="outline">10x</Badge>
                                      </label>
                                    </div>
                                  </FormItem>
                                  <FormItem>
                                    <div className="relative">
                                      <RadioGroupItem value="burn" id="burn" className="peer sr-only" />
                                      <label
                                        htmlFor="burn"
                                        className="flex items-center justify-between rounded-lg border-2 border-muted bg-card p-3 hover-elevate cursor-pointer peer-data-[state=checked]:border-primary"
                                      >
                                        <span className="flex items-center gap-2">
                                          <Flame className="h-4 w-4 text-destructive" />
                                          Burn WAN (permanent)
                                        </span>
                                        <Badge variant="destructive">25x</Badge>
                                      </label>
                                    </div>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Alert>
                          <Coins className="h-4 w-4" />
                          <AlertDescription>
                            Your voting power: <strong className="font-mono">{calculateVotingPower().toLocaleString()} votes</strong>
                          </AlertDescription>
                        </Alert>

                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => setShowVoteForm(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1" disabled={voteMutation.isPending} data-testid="button-submit-vote">
                            {voteMutation.isPending ? "Submitting..." : "Submit Vote"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            )}

            {proposal.type === "funding" && proposal.status === "approved" && isPartner && !hasSupported && !isCreator && (
              <Card>
                <CardHeader>
                  <CardTitle>Provide Partner Support</CardTitle>
                </CardHeader>
                <CardContent>
                  {!showPartnerForm ? (
                    <Button onClick={() => setShowPartnerForm(true)} data-testid="button-add-support">
                      <Users className="h-4 w-4 mr-2" />
                      Add Support
                    </Button>
                  ) : (
                    <Form {...partnerForm}>
                      <form onSubmit={partnerForm.handleSubmit((data) => partnerSupportMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={partnerForm.control}
                          name="wanAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>WAN Amount</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Enter support amount"
                                  data-testid="input-support-amount"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={partnerForm.control}
                          name="actionType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Action Type</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  className="grid gap-2"
                                >
                                  <FormItem>
                                    <div className="relative">
                                      <RadioGroupItem value="lock" id="partner_lock" className="peer sr-only" />
                                      <label
                                        htmlFor="partner_lock"
                                        className="flex items-center gap-3 rounded-lg border-2 border-muted bg-card p-3 hover-elevate cursor-pointer peer-data-[state=checked]:border-primary"
                                      >
                                        <Lock className="h-5 w-5 text-primary" />
                                        <span>Lock WAN</span>
                                      </label>
                                    </div>
                                  </FormItem>
                                  <FormItem>
                                    <div className="relative">
                                      <RadioGroupItem value="burn" id="partner_burn" className="peer sr-only" />
                                      <label
                                        htmlFor="partner_burn"
                                        className="flex items-center gap-3 rounded-lg border-2 border-muted bg-card p-3 hover-elevate cursor-pointer peer-data-[state=checked]:border-primary"
                                      >
                                        <Flame className="h-5 w-5 text-destructive" />
                                        <span>Burn WAN</span>
                                      </label>
                                    </div>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => setShowPartnerForm(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1" disabled={partnerSupportMutation.isPending} data-testid="button-submit-support">
                            {partnerSupportMutation.isPending ? "Submitting..." : "Add Support"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {proposal.status === "active" && proposal.votingEndsAt && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Time Remaining</CardTitle>
                </CardHeader>
                <CardContent>
                  <CountdownTimer endDate={new Date(proposal.votingEndsAt)} />
                </CardContent>
              </Card>
            )}

            {(proposal.status === "active" || proposal.status === "passed" || proposal.status === "rejected") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Voting Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <VoteProgress votesFor={proposal.votesFor} votesAgainst={proposal.votesAgainst} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">{proposal.type}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={proposal.status} />
                </div>
                {proposal.xpBurned && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">XP Burned</span>
                      <span className="font-mono font-semibold">{Number(proposal.xpBurned).toLocaleString()}</span>
                    </div>
                  </>
                )}
                {votes && votes.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Voters</span>
                      <span className="font-semibold">{votes.length}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
