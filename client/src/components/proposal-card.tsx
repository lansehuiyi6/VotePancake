import { Card, CardHeader, CardContent, CardFooter } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { StatusBadge } from "./status-badge";
import { CountdownTimer } from "./countdown-timer";
import { VoteProgress } from "./vote-progress";
import { Link } from "wouter";
import { DollarSign, User, Users } from "lucide-react";
import type { Proposal } from "@shared/schema";

interface ProposalCardProps {
  proposal: Proposal & {
    creator: { username: string };
    partnerCount?: number;
    totalPartnerStake?: string;
  };
  currentUserId?: string;
  onCancel?: (id: string) => void;
  compact?: boolean;
}

export function ProposalCard({ proposal, currentUserId, onCancel, compact = false }: ProposalCardProps) {
  const isCreator = currentUserId === proposal.creatorId;
  const canCancel = isCreator && proposal.status === "pending";

  if (compact) {
    return (
      <Card className="hover-elevate transition-all duration-200" data-testid={`card-proposal-${proposal.id}`}>
        <CardContent className="p-4">
          <Link href={`/proposals/${proposal.id}`} className="block">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={proposal.status} />
                  {proposal.type === "funding" && (
                    <Badge variant="secondary">
                      <DollarSign className="h-3 w-3 mr-1" />
                      Funding Request
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg font-bold mb-1 truncate" data-testid={`text-proposal-title-${proposal.id}`}>
                  {proposal.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {proposal.description}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {proposal.creator.username}
                  </div>
                  {proposal.partnerCount && proposal.partnerCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {proposal.partnerCount} partners
                    </div>
                  )}
                </div>
              </div>
              {proposal.status === "active" && proposal.votingEndsAt && (
                <div className="flex-shrink-0">
                  <CountdownTimer endDate={new Date(proposal.votingEndsAt)} />
                </div>
              )}
            </div>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover-elevate transition-all duration-200" data-testid={`card-proposal-${proposal.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge status={proposal.status} />
            {proposal.type === "funding" && (
              <Badge variant="secondary">
                <DollarSign className="h-3 w-3 mr-1" />
                Funding Request
              </Badge>
            )}
          </div>
          <h3 className="text-xl font-bold mb-2" data-testid={`text-proposal-title-${proposal.id}`}>
            {proposal.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {proposal.description}
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Proposed by</div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{proposal.creator.username}</span>
              </div>
            </div>

            {proposal.type === "funding" && proposal.fundingAmount && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Requesting</div>
                <div className="text-2xl font-bold font-mono text-primary">
                  {Number(proposal.fundingAmount).toLocaleString()} WAN
                </div>
                {proposal.stakeAmount && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Staked: {Number(proposal.stakeAmount).toLocaleString()} WAN ({proposal.stakeType})
                  </div>
                )}
                {proposal.totalPartnerStake && Number(proposal.totalPartnerStake) > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Partner Support: {Number(proposal.totalPartnerStake).toLocaleString()} WAN
                  </div>
                )}
              </div>
            )}

            {proposal.xpBurned && (
              <div className="text-xs text-muted-foreground">
                XP Burned: {Number(proposal.xpBurned).toLocaleString()}
              </div>
            )}
          </div>

          {proposal.status === "active" && (
            <div className="space-y-4">
              {proposal.votingEndsAt && (
                <CountdownTimer endDate={new Date(proposal.votingEndsAt)} />
              )}
              <VoteProgress votesFor={proposal.votesFor} votesAgainst={proposal.votesAgainst} />
            </div>
          )}

          {(proposal.status === "passed" || proposal.status === "rejected") && (
            <div>
              <VoteProgress votesFor={proposal.votesFor} votesAgainst={proposal.votesAgainst} />
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 flex-wrap">
        <Link href={`/proposals/${proposal.id}`}>
          <Button variant="outline" data-testid={`button-view-details-${proposal.id}`}>
            View Details
          </Button>
        </Link>

        {proposal.status === "active" && (
          <Link href={`/proposals/${proposal.id}`}>
            <Button data-testid={`button-vote-${proposal.id}`}>
              Vote Now
            </Button>
          </Link>
        )}

        {canCancel && onCancel && (
          <Button
            variant="destructive"
            onClick={() => onCancel(proposal.id)}
            data-testid={`button-cancel-${proposal.id}`}
          >
            Cancel Proposal
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
