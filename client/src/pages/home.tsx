import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProposalCard } from "@/components/proposal-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Vote, FileText } from "lucide-react";
import type { Proposal } from "@shared/schema";

export default function Home() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: proposals, isLoading } = useQuery<(Proposal & { creator: { username: string }; partnerCount?: number; totalPartnerStake?: string })[]>({
    queryKey: ["/api/proposals"],
  });

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const filteredProposals = proposals?.filter(p => {
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    
    // Handle status filter - "approved" should include both "approved" and "publicized" statuses
    if (statusFilter !== "all") {
      if (statusFilter === "approved") {
        // "Soon" tab should show both approved and publicized proposals
        if (p.status !== "approved" && p.status !== "publicized") return false;
      } else if (p.status !== statusFilter) {
        return false;
      }
    }
    
    if (p.status === "pending" && p.creatorId !== currentUser?.id && currentUser?.role !== "admin") return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <section className="relative bg-gradient-to-br from-primary/20 via-chart-2/10 to-background py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">
            WAN Governance
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Have your say in the future of the WAN Ecosystem
          </p>
          {currentUser ? (
            <Link href="/proposals/create">
              <Button size="lg" className="gap-2" data-testid="button-create-proposal-hero">
                <Plus className="h-5 w-5" />
                Make a Proposal
              </Button>
            </Link>
          ) : (
            <Link href="/register">
              <Button size="lg" className="gap-2" data-testid="button-register-hero">
                Get Started
              </Button>
            </Link>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-3xl font-bold">Proposals</h2>
          {currentUser && (
            <Link href="/proposals/create">
              <Button className="gap-2" data-testid="button-create-proposal">
                <Plus className="h-4 w-4" />
                Create Proposal
              </Button>
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-wrap gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Type</div>
              <Tabs value={typeFilter} onValueChange={setTypeFilter}>
                <TabsList>
                  <TabsTrigger value="all" data-testid="filter-type-all">All</TabsTrigger>
                  <TabsTrigger value="funding" data-testid="filter-type-funding">
                    <FileText className="h-4 w-4 mr-2" />
                    Funding
                  </TabsTrigger>
                  <TabsTrigger value="parameter" data-testid="filter-type-parameter">
                    <Vote className="h-4 w-4 mr-2" />
                    Parameter
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-2">Status</div>
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList>
                  <TabsTrigger value="all" data-testid="filter-status-all">All</TabsTrigger>
                  {currentUser?.role === "admin" && (
                    <TabsTrigger value="pending" data-testid="filter-status-pending">未公示</TabsTrigger>
                  )}
                  <TabsTrigger value="active" data-testid="filter-status-active">Vote Now</TabsTrigger>
                  <TabsTrigger value="approved" data-testid="filter-status-approved">Soon</TabsTrigger>
                  <TabsTrigger value="passed" data-testid="filter-status-passed">Passed</TabsTrigger>
                  <TabsTrigger value="rejected" data-testid="filter-status-rejected">Failed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        ) : filteredProposals && filteredProposals.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                currentUserId={currentUser?.id}
                currentUserRole={currentUser?.role}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="mb-6 flex justify-center">
              <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                <Vote className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">No proposals found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {currentUser
                ? "Be the first to create a proposal and shape the future of the WAN ecosystem."
                : "Register to participate in governance and create proposals."}
            </p>
            {currentUser && (
              <Link href="/proposals/create">
                <Button data-testid="button-create-first-proposal">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Proposal
                </Button>
              </Link>
            )}
          </div>
        )}
      </section>

      {filteredProposals && filteredProposals.length > 0 && (
        <section className="bg-muted/30 py-16 px-4 mt-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Got a suggestion?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Community proposals are a great way to see how the community feels about your ideas.
              Proposals with strong community support may be implemented to improve the WAN ecosystem.
            </p>
            {currentUser && (
              <Link href="/proposals/create">
                <Button size="lg" variant="outline" className="gap-2" data-testid="button-make-suggestion">
                  <Plus className="h-5 w-5" />
                  Make a Proposal
                </Button>
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
