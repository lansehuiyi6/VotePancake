import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, DollarSign, Flame, Lock, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const proposalSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters"),
  description: z.string().min(50, "Description must be at least 50 characters"),
  type: z.enum(["funding", "parameter"]),
  fundingAmount: z.string().optional(),
  stakeAmount: z.string().optional(),
  stakeType: z.enum(["lock", "burn"]).optional(),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

export default function CreateProposal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: params } = useQuery<any>({
    queryKey: ["/api/system/params"],
  });

  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "parameter",
    },
  });

  const proposalType = form.watch("type");
  const stakeAmount = form.watch("stakeAmount");
  const stakeType = form.watch("stakeType");

  const xpCost = params?.xpBurnCost || "110000";
  const lockMultiplier = params?.lockMultiplier || "10";
  const burnMultiplier = params?.burnMultiplier || "50";

  const calculateMaxFunding = () => {
    if (!stakeAmount || !stakeType) return 0;
    const multiplier = stakeType === "lock" ? Number(lockMultiplier) : Number(burnMultiplier);
    return Number(stakeAmount) * multiplier;
  };

  const createProposalMutation = useMutation({
    mutationFn: (data: ProposalFormData) => apiRequest("POST", "/api/proposals", data),
    onSuccess: () => {
      toast({
        title: "Proposal created successfully!",
        description: "Your proposal has been submitted for review.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create proposal",
        description: error.message || "Please check your balance and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProposalFormData) => {
    if (proposalType === "funding" && (!data.fundingAmount || !data.stakeAmount || !data.stakeType)) {
      toast({
        title: "Missing funding details",
        description: "Please provide funding amount and stake details.",
        variant: "destructive",
      });
      return;
    }
    createProposalMutation.mutate(data);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to create a proposal</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isAdmin = currentUser?.role === "admin";
  const hasEnoughXP = Number(currentUser?.xpBalance || 0) >= Number(xpCost);

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create Proposal</h1>
          <p className="text-muted-foreground">Submit your proposal to the WAN community for review</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                1
              </div>
              <span className="font-semibold">Type</span>
            </div>
            <Separator className="flex-1 mx-4" />
            <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                2
              </div>
              <span className="font-semibold">Details</span>
            </div>
            <Separator className="flex-1 mx-4" />
            <div className={`flex items-center gap-2 ${step >= 3 ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                3
              </div>
              <span className="font-semibold">Funding</span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Proposal Type</CardTitle>
                  <CardDescription>Choose the type of proposal you want to create</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid md:grid-cols-2 gap-4"
                          >
                            <FormItem>
                              <FormControl>
                                <div className="relative">
                                  <RadioGroupItem value="parameter" id="parameter" className="peer sr-only" />
                                  <label
                                    htmlFor="parameter"
                                    className="flex flex-col items-start gap-4 rounded-xl border-2 border-muted bg-card p-6 hover-elevate cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                                    data-testid="option-type-parameter"
                                  >
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                      <Zap className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                      <div className="font-bold text-lg mb-2">Parameter Adjustment</div>
                                      <p className="text-sm text-muted-foreground">
                                        Propose changes to system parameters or ecosystem improvements. No funding required.
                                      </p>
                                    </div>
                                    <Badge variant="secondary" className="mt-2">
                                      XP Required: {Number(xpCost).toLocaleString()}
                                      {isAdmin && " (Waived for admin)"}
                                    </Badge>
                                  </label>
                                </div>
                              </FormControl>
                            </FormItem>
                            <FormItem>
                              <FormControl>
                                <div className="relative">
                                  <RadioGroupItem value="funding" id="funding" className="peer sr-only" />
                                  <label
                                    htmlFor="funding"
                                    className="flex flex-col items-start gap-4 rounded-xl border-2 border-muted bg-card p-6 hover-elevate cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                                    data-testid="option-type-funding"
                                  >
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                      <DollarSign className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                      <div className="font-bold text-lg mb-2">Funding Request</div>
                                      <p className="text-sm text-muted-foreground">
                                        Request community funds for your project. Requires WAN stake in addition to XP.
                                      </p>
                                    </div>
                                    <Badge variant="secondary" className="mt-2">
                                      XP + WAN Stake Required
                                    </Badge>
                                  </label>
                                </div>
                              </FormControl>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end mt-6">
                    <Button type="button" onClick={() => setStep(2)} data-testid="button-next-step-1">
                      Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Proposal Details</CardTitle>
                  <CardDescription>Provide detailed information about your proposal</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter a clear and concise title" data-testid="input-title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your proposal in detail. Include objectives, implementation plan, and expected outcomes."
                            rows={8}
                            data-testid="input-description"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Provide comprehensive details to help the community make an informed decision
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-4 justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} data-testid="button-back-step-2">
                      Back
                    </Button>
                    <Button type="button" onClick={() => setStep(3)} data-testid="button-next-step-2">
                      Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <>
                {proposalType === "funding" ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Funding & Stake Configuration</CardTitle>
                      <CardDescription>Set your funding request amount and stake commitment</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="stakeType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stake Type</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="grid md:grid-cols-2 gap-4"
                              >
                                <FormItem>
                                  <FormControl>
                                    <div className="relative">
                                      <RadioGroupItem value="lock" id="lock" className="peer sr-only" />
                                      <label
                                        htmlFor="lock"
                                        className="flex items-center gap-4 rounded-xl border-2 border-muted bg-card p-4 hover-elevate cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                                        data-testid="option-stake-lock"
                                      >
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                          <Lock className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-bold mb-1">Lock WAN</div>
                                          <p className="text-sm text-muted-foreground">10x funding multiplier</p>
                                          <Badge variant="outline" className="mt-2">{lockMultiplier}x Multiplier</Badge>
                                        </div>
                                      </label>
                                    </div>
                                  </FormControl>
                                </FormItem>
                                <FormItem>
                                  <FormControl>
                                    <div className="relative">
                                      <RadioGroupItem value="burn" id="burn" className="peer sr-only" />
                                      <label
                                        htmlFor="burn"
                                        className="flex items-center gap-4 rounded-xl border-2 border-muted bg-card p-4 hover-elevate cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                                        data-testid="option-stake-burn"
                                      >
                                        <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                                          <Flame className="h-5 w-5 text-destructive" />
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-bold mb-1">Burn WAN</div>
                                          <p className="text-sm text-muted-foreground">50x funding multiplier</p>
                                          <Badge variant="destructive" className="mt-2">{burnMultiplier}x Multiplier</Badge>
                                        </div>
                                      </label>
                                    </div>
                                  </FormControl>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="stakeAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stake Amount (WAN)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Enter stake amount"
                                data-testid="input-stake-amount"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Amount of WAN to {stakeType === "burn" ? "burn" : "lock"} as commitment
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {stakeAmount && stakeType && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <div>
                                <strong>Base funding limit from your stake:</strong> <span className="font-mono font-bold">{calculateMaxFunding().toLocaleString()} WAN</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                You can request more than this amount. Partner support can increase your available funding beyond the base limit.
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <FormField
                        control={form.control}
                        name="fundingAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Funding Request (WAN)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Enter requested amount"
                                data-testid="input-funding-amount"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="space-y-1">
                              <span className="block">Base limit: {calculateMaxFunding().toLocaleString()} WAN (from your {stakeAmount} WAN stake × {stakeType === 'lock' ? lockMultiplier : burnMultiplier})</span>
                              <span className="block text-xs">💡 Partner support allows you to request additional funding beyond your base stake limit</span>
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Alert variant="destructive">
                        <Flame className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Cost:</strong> {Number(xpCost).toLocaleString()} XP will be burned upon submission
                          {!isAdmin && ` (Your balance: ${Number(currentUser?.xpBalance || 0).toLocaleString()} XP)`}
                        </AlertDescription>
                      </Alert>

                      <div className="flex gap-4 justify-between">
                        <Button type="button" variant="outline" onClick={() => setStep(2)} data-testid="button-back-step-3">
                          Back
                        </Button>
                        <Button
                          type="submit"
                          disabled={createProposalMutation.isPending || (!isAdmin && !hasEnoughXP)}
                          data-testid="button-submit-proposal"
                        >
                          {createProposalMutation.isPending ? "Creating..." : "Create Proposal"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Review & Submit</CardTitle>
                      <CardDescription>Review your proposal before submitting</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert variant="destructive">
                        <Flame className="h-4 w-4" />
                        <AlertDescription>
                          {isAdmin ? (
                            <strong>As an admin, XP burn requirement is waived</strong>
                          ) : (
                            <>
                              <strong>Cost:</strong> {Number(xpCost).toLocaleString()} XP will be burned upon submission
                              <br />
                              Your balance: {Number(currentUser?.xpBalance || 0).toLocaleString()} XP
                            </>
                          )}
                        </AlertDescription>
                      </Alert>

                      <div className="flex gap-4 justify-between">
                        <Button type="button" variant="outline" onClick={() => setStep(2)} data-testid="button-back-step-3">
                          Back
                        </Button>
                        <Button
                          type="submit"
                          disabled={createProposalMutation.isPending || (!isAdmin && !hasEnoughXP)}
                          data-testid="button-submit-proposal"
                        >
                          {createProposalMutation.isPending ? "Creating..." : "Create Proposal"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}
