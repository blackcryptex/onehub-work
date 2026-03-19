// Extended event types for Action Bar + Panes
export type Status = 'draft'|'sent'|'pending'|'accepted'|'rejected'|'signed'|'completed';

export type RSVP = 'yes'|'no'|'maybe';

export type VendorCategory =
  | 'venue'|'catering'|'florist'|'music'|'photo'|'video'|'planner'
  | 'decor'|'officiant'|'transport'|'cake'|'other';

export type Vendor = {
  id: string;
  name: string;
  category: VendorCategory;
  city?: string;
  email?: string;
  phone?: string;
  website?: string;
  shortlisted?: boolean;   // added to shortlist from Vendors pane
  secured?: boolean;       // true if contract signed or deposit paid
};

export type ProposalLine = {
  id: string;
  category: VendorCategory;
  title: string;
  description?: string;
  qty?: number;
  unitPrice?: number;
  total?: number;
  vendorId?: string;       // link to chosen vendor
};

export type Proposal = {
  id: string;
  eventId: string;
  vendorId?: string;
  vendorName?: string;
  status: Status;          // draft/sent/pending/accepted/rejected
  lines: ProposalLine[];
  notes?: string;
  createdAt: string;       // ISO
  lastUpdated?: string;    // ISO
};

export type ContractClause = { id: string; title: string; body: string };

export type Contract = {
  id: string;
  eventId: string;
  fromProposalId: string;  // generated from accepted proposal
  counterparty: string;    // vendor or client name
  status: Status;          // draft/sent/signed/completed/rejected
  clauses: ContractClause[];
  lastUpdated: string;     // ISO
  value?: number;         // optional contract value if known
};

export type BudgetAllocation = {
  category: VendorCategory;      // enum/union only
  planned?: number;              // user plan
  projected?: number;             // from proposals/contracts
  actual?: number | null;         // after invoices (normalize undefined -> null)
};

export type BudgetSnapshot = {
  total?: number;
  spent?: number;         // sum of actuals
  remaining?: number;     // total - spent (or total - projected if no actual)
  allocations?: BudgetAllocation[];
};

export type Guest = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  rsvp?: RSVP;
  meal?: 'standard'|'vegetarian'|'vegan'|'gluten-free'|'kosher'|'halal'|'other';
  notes?: string;
};

export type Task = { 
  id: string; 
  title: string; 
  due: string; 
  done: boolean; 
  assignee?: string;
  priority?: 'low'|'med'|'high';
  linkedTo?: 'vendor'|'proposal'|'contract'|'guest'|'milestone'|null; 
  linkedId?: string;
  checklist?: { id: string; text: string; done: boolean }[];
};

export type Milestone = { 
  id: string; 
  title: string; 
  targetDate: string;
  status?: 'planned'|'at risk'|'achieved'|'slipped';
  critical?: boolean;
  linkedTaskIds: string[];
};

export type EventItem = {
  id: string;
  type?: 'wedding'|'conference'|'party'|'reunion'|'gala'|'other';
  name: string;
  date: string;            // ISO
  location?: string;
  city?: string;
  description?: string;
  progress: number;
  budget?: BudgetSnapshot;
  vendors?: Vendor[];
  proposals?: Proposal[];
  contracts?: Contract[];
  guests?: Guest[];
  tasks?: Task[];
  milestones?: Milestone[];
};

