export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'pending' | 'active' | 'completed' | 'rejected';
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  votingStartsAt?: string;
  votingEndsAt?: string;
  votesFor: string;
  votesAgainst: string;
}

export interface Vote {
  id: string;
  proposalId: string;
  voterId: string;
  inFavor: boolean;
  amount: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerSupport {
  id: string;
  proposalId: string;
  partnerId: string;
  status: 'pending' | 'approved' | 'rejected';
  amount: string;
  message?: string;
  processed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  id: string;
  proposalId: string;
  userId: string;
  amount: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt: string;
  updatedAt: string;
}
