// Shared types for DIY Planner
export type Status = 'draft' | 'sent' | 'pending' | 'accepted' | 'rejected' | 'signed' | 'completed';

export type RSVP = 'yes' | 'no' | 'maybe';

export type Guest = { 
  name: string; 
  email?: string; 
  rsvp?: RSVP;
};

export type VendorLink = {
  id: string;
  name: string;
  category: 'venue' | 'catering' | 'florist' | 'music' | 'photo' | 'other';
  secured: boolean;            // secured = contract signed or deposit paid
  contactEmail?: string;
  shortlisted?: boolean;
};

export type Proposal = {
  id: string;
  vendorName: string;
  amount?: number;
  status: Status;              // draft/sent/pending/accepted/rejected
  sentAt?: string;             // ISO
};

export type Contract = {
  id: string;
  counterparty: string;        // vendor or client
  status: Status;              // draft/sent/signed/completed/rejected
  lastUpdated?: string;        // ISO
};

export type Task = { 
  id: string; 
  title: string; 
  due: string; 
  done: boolean;
  assignee?: string;
};

export type Milestone = { 
  id: string; 
  title: string; 
  due: string; 
  status: Status;
};

export type EventItem = {
  id: string;
  slug?: string;        // Event slug for navigation and delete operations
  name: string;
  date: string;         // ISO
  location?: string;
  description?: string;
  progress: number;     // 0..100
  budget?: { total?: number; spent?: number };
  city?: string;
  vendors?: VendorLink[];
  proposals?: Proposal[];
  contracts?: Contract[];
  guests?: Guest[];
  tasks?: Task[];
  milestones?: Milestone[];
};
