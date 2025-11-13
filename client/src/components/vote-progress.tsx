import { ThumbsUp, ThumbsDown } from "lucide-react";

interface VoteProgressProps {
  votesFor: string;
  votesAgainst: string;
  className?: string;
}

export function VoteProgress({ votesFor, votesAgainst, className }: VoteProgressProps) {
  const forVotes = Number(votesFor);
  const againstVotes = Number(votesAgainst);
  const total = forVotes + againstVotes;

  const forPercentage = total > 0 ? (forVotes / total) * 100 : 0;
  const againstPercentage = total > 0 ? (againstVotes / total) * 100 : 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2 gap-4">
        <div className="flex items-center gap-2">
          <ThumbsUp className="h-4 w-4 text-success" />
          <span className="text-sm font-semibold">{forPercentage.toFixed(1)}%</span>
          <span className="text-xs text-muted-foreground">For</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Against</span>
          <span className="text-sm font-semibold">{againstPercentage.toFixed(1)}%</span>
          <ThumbsDown className="h-4 w-4 text-destructive" />
        </div>
      </div>

      <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
        {forPercentage > 0 && (
          <div
            className="bg-success transition-all duration-300"
            style={{ width: `${forPercentage}%` }}
          />
        )}
        {againstPercentage > 0 && (
          <div
            className="bg-destructive transition-all duration-300"
            style={{ width: `${againstPercentage}%` }}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-2 gap-4">
        <span className="text-xs text-muted-foreground font-mono">{forVotes.toLocaleString()} votes</span>
        <span className="text-xs text-muted-foreground font-mono">{againstVotes.toLocaleString()} votes</span>
      </div>
    </div>
  );
}
