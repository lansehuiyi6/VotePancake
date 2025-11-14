import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Lock, Flame, Mail, MessageCircle, Hash } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

const supportSchema = z.object({
  wanAmount: z.string().min(1, "金额必填"),
  actionType: z.enum(["lock", "burn"], { required_error: "请选择操作类型" }),
  contactEmail: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
  contactTelegram: z.string().optional().or(z.literal("")),
  contactDiscord: z.string().optional().or(z.literal("")),
}).refine(
  (data) => {
    return !!(data.contactEmail || data.contactTelegram || data.contactDiscord);
  },
  {
    message: "邮箱、Telegram、Discord 至少填写一项",
    path: ["contactEmail"],
  }
);

type SupportFormData = z.infer<typeof supportSchema>;

export default function SupportProposal() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: proposal, isLoading } = useQuery<any>({
    queryKey: [`/api/proposals/${id}`],
  });

  const form = useForm<SupportFormData>({
    resolver: zodResolver(supportSchema),
    defaultValues: {
      wanAmount: "",
      actionType: "lock",
      contactEmail: "",
      contactTelegram: "",
      contactDiscord: "",
    },
  });

  const supportMutation = useMutation({
    mutationFn: (data: SupportFormData) => apiRequest("POST", `/api/proposals/${id}/support`, data),
    onSuccess: () => {
      toast({
        title: "支持成功！",
        description: "您的 Partner 支持已记录。",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/proposals/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/proposals/${id}/partners`] });
      queryClient.invalidateQueries({ queryKey: ["/api/partner/supports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partner/available-proposals"] });
      setLocation(`/proposals/${id}`);
    },
    onError: (error: any) => {
      toast({
        title: "支持失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">提案不存在</h1>
          <Button onClick={() => setLocation("/")} data-testid="button-back">
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  const fundingGap = Number(proposal.fundingRequested || 0) - 
    (Number(proposal.stakeAmount || 0) * (proposal.stakeType === "burn" ? 50 : 10)) -
    Number(proposal.totalPartnerStake || 0);

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => setLocation(`/proposals/${id}`)}
          className="mb-6"
          data-testid="button-back-to-proposal"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回提案详情
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">提供 Partner 支持</h1>
          <p className="text-muted-foreground">为该提案提供资金支持，帮助其达到资金要求</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <StatusBadge status={proposal.status} />
              <span className="text-sm text-muted-foreground">提案详情</span>
            </div>
            <CardTitle>{proposal.title}</CardTitle>
            <CardDescription className="mt-2">{proposal.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">资金需求</div>
                <div className="font-mono font-bold text-lg text-primary">
                  {Number(proposal.fundingRequested || 0).toLocaleString()} WAN
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">创建者质押</div>
                <div className="font-mono font-semibold text-lg">
                  {Number(proposal.stakeAmount || 0).toLocaleString()} WAN
                  <span className="text-xs ml-2 text-muted-foreground">
                    ({proposal.stakeType})
                  </span>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">已有 Partner 支持</div>
                <div className="font-mono font-semibold text-lg text-green-600">
                  {Number(proposal.totalPartnerStake || 0).toLocaleString()} WAN
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">还需支持</div>
                <div className="font-mono font-bold text-lg text-orange-600">
                  {Math.max(0, fundingGap).toLocaleString()} WAN
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>支持表单</CardTitle>
            <CardDescription>请填写支持金额、选择操作类型并提供联系方式</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => supportMutation.mutate(data))} className="space-y-6">
                <FormField
                  control={form.control}
                  name="wanAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>支持金额 (WAN)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="输入支持金额"
                          data-testid="input-support-amount"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        您的余额: {Number(currentUser?.wanBalance || 0).toLocaleString()} WAN
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>操作类型</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid gap-3"
                        >
                          <FormItem>
                            <div className="relative">
                              <RadioGroupItem value="lock" id="support_lock" className="peer sr-only" />
                              <label
                                htmlFor="support_lock"
                                className="flex items-center gap-3 rounded-md border-2 border-muted bg-card p-4 hover-elevate active-elevate-2 peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                                data-testid="option-lock"
                              >
                                <Lock className="h-5 w-5 text-blue-600" />
                                <div className="flex-1">
                                  <div className="font-semibold">质押 (Lock)</div>
                                  <div className="text-xs text-muted-foreground">
                                    锁定 WAN，提案结束后可取回
                                  </div>
                                </div>
                              </label>
                            </div>
                          </FormItem>

                          <FormItem>
                            <div className="relative">
                              <RadioGroupItem value="burn" id="support_burn" className="peer sr-only" />
                              <label
                                htmlFor="support_burn"
                                className="flex items-center gap-3 rounded-md border-2 border-muted bg-card p-4 hover-elevate active-elevate-2 peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                                data-testid="option-burn"
                              >
                                <Flame className="h-5 w-5 text-orange-600" />
                                <div className="flex-1">
                                  <div className="font-semibold">销毁 (Burn)</div>
                                  <div className="text-xs text-muted-foreground">
                                    永久销毁 WAN，获得更高影响力
                                  </div>
                                </div>
                              </label>
                            </div>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">联系方式（至少填写一项）</h3>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            邮箱
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="your@email.com"
                              data-testid="input-contact-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactTelegram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" />
                            Telegram
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="@username"
                              data-testid="input-contact-telegram"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactDiscord"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            Discord
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="username#1234"
                              data-testid="input-contact-discord"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation(`/proposals/${id}`)}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={supportMutation.isPending}
                    data-testid="button-submit-support"
                  >
                    {supportMutation.isPending ? "提交中..." : "提交支持"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
