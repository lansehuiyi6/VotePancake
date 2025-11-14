import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function MyProposals() {
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: proposals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/proposals"],
  });

  const myProposals = proposals?.filter(p => p.creatorId === currentUser?.id) || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      pending: "outline",
      publicized: "secondary",
      "vote-now": "default",
      passed: "default",
      failed: "destructive",
    };
    return variants[status] || "outline";
  };

  const getTypeBadge = (type: string) => {
    return type === "funding" ? "default" : "secondary";
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to view your proposals.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button data-testid="button-login">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Proposals</h1>
          <p className="text-muted-foreground">
            {myProposals.length} proposal{myProposals.length !== 1 ? "s" : ""} created
          </p>
        </div>
        <Link href="/proposals/create">
          <Button className="gap-2" data-testid="button-create-proposal">
            <Plus className="h-4 w-4" />
            Create Proposal
          </Button>
        </Link>
      </div>

      {myProposals.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Proposals Yet</CardTitle>
            <CardDescription>
              You haven't created any proposals. Start by creating your first proposal!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/proposals/create">
              <Button className="gap-2" data-testid="button-create-first-proposal">
                <Plus className="h-4 w-4" />
                Create Your First Proposal
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {myProposals.map((proposal) => (
            <Link key={proposal.id} href={`/proposals/${proposal.id}`}>
              <Card className="hover-elevate cursor-pointer" data-testid={`card-proposal-${proposal.id}`}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant={getTypeBadge(proposal.type)}>
                          {proposal.type === "funding" ? "Funding" : "Parameter"}
                        </Badge>
                        <Badge variant={getStatusBadge(proposal.status)}>
                          {proposal.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl mb-2" data-testid={`text-proposal-title-${proposal.id}`}>
                        {proposal.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {proposal.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Created {format(new Date(proposal.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    {proposal.type === "funding" && proposal.fundingRequested && (
                      <div>
                        <span className="font-semibold">
                          {Number(proposal.fundingRequested).toLocaleString()} WAN
                        </span>{" "}
                        requested
                      </div>
                    )}
                    {(proposal.status === "vote-now" || proposal.status === "passed" || proposal.status === "failed") && (
                      <div>
                        <span className="text-chart-1 font-semibold">
                          {Number(proposal.votesFor).toLocaleString()}
                        </span>{" "}
                        for /{" "}
                        <span className="text-chart-2 font-semibold">
                          {Number(proposal.votesAgainst).toLocaleString()}
                        </span>{" "}
                        against
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
