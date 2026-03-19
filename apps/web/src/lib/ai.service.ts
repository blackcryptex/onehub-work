// lib/ai.service.ts
import { EventItem, Vendor, Proposal, ProposalLine, Contract, BudgetSnapshot, BudgetAllocation, Guest, Task, Milestone, VendorCategory } from './types.event';
import { buildPlannerPayload as _buildPlannerPayload, PLANNER_SYSTEM_PROMPT as _PLANNER_SYSTEM_PROMPT } from './ai/buildPlannerPayload';
import { toVendorCategory } from './vendors/category';

export async function aiSuggestVendors(event: EventItem): Promise<Vendor[]> {
  // Generate category-appropriate vendors for event.type & city
  return [
    { id:'v1', name:'Grand Hall', category:'venue', city:event.city, website:'#' },
    { id:'v2', name:'Silver Spoon Catering', category:'catering', city:event.city },
    { id:'v3', name:'Lens & Love Photography', category:'photo', city:event.city },
    { id:'v4', name:'DJ Nightwave', category:'music', city:event.city },
    { id:'v5', name:'Bloom Studio Florist', category:'florist', city:event.city },
  ];
}

export async function aiProposalChecklist(event: EventItem): Promise<ProposalLine[]> {
  // Defaults per event.type (wedding emphasized)
  const base: ProposalLine[] = [
    { id:'pl-venue', category:'venue', title:'Venue rental (ceremony + reception)' },
    { id:'pl-cater', category:'catering', title:'Full-service catering (estimate 100 guests)' },
    { id:'pl-photo', category:'photo', title:'Photography (8 hours, 2 shooters)' },
    { id:'pl-video', category:'video', title:'Videography (highlight film)' },
    { id:'pl-music', category:'music', title:'DJ/MC + basic lighting' },
    { id:'pl-flor',  category:'florist', title:'Bouquets, boutonnieres, centerpieces' },
    { id:'pl-cake',  category:'cake', title:'Wedding cake (3 tiers)' },
    { id:'pl-decor', category:'decor', title:'Decor & rentals (linens, tables)' },
    { id:'pl-trans', category:'transport', title:'Limo/transport' },
    { id:'pl-off',   category:'officiant', title:'Officiant' },
  ];
  return event.type === 'wedding' ? base : base.slice(0,6);
}

export async function aiGenerateProposals(event: EventItem, selectedLines: ProposalLine[], vendors: Vendor[]): Promise<Proposal[]> {
  const now = new Date().toISOString();
  return selectedLines.map((line, i) => {
    const match = vendors.find(v => v.shortlisted && v.category === line.category);
    return {
      id: `prop-${Date.now()}-${i}`,
      eventId: event.id,
      vendorId: match?.id,
      vendorName: match?.name,
      status: 'draft',
      lines: [{ ...line, vendorId: match?.id }],
      createdAt: now, lastUpdated: now,
      notes: 'AI draft. Review scope/pricing/terms before sending.',
    };
  });
}

export async function aiProposalFromVendor(event: EventItem, vendor: Vendor): Promise<Proposal> {
  const now = new Date().toISOString();
  const guestCount = event.guests?.length || 100; // estimate if not available
  
  // Generate lines typical for vendor category
  const lines: ProposalLine[] = [];
  
  switch (vendor.category) {
    case 'venue':
      lines.push({
        id: 'venue-rental',
        category: 'venue',
        title: 'Venue rental (ceremony + reception)',
        qty: 1,
        unitPrice: 5000,
        total: 5000,
        vendorId: vendor.id,
      });
      break;
    case 'catering':
      lines.push({
        id: 'catering-full',
        category: 'catering',
        title: `Full-service catering (${guestCount} guests)`,
        qty: guestCount,
        unitPrice: 75,
        total: guestCount * 75,
        vendorId: vendor.id,
      });
      break;
    case 'photo':
      lines.push({
        id: 'photo-coverage',
        category: 'photo',
        title: 'Photography (8 hours, 2 shooters)',
        qty: 1,
        unitPrice: 3000,
        total: 3000,
        vendorId: vendor.id,
      });
      break;
    case 'music':
      lines.push({
        id: 'music-dj',
        category: 'music',
        title: 'DJ/MC + basic lighting',
        qty: 1,
        unitPrice: 1500,
        total: 1500,
        vendorId: vendor.id,
      });
      break;
    case 'florist':
      lines.push({
        id: 'florist-basic',
        category: 'florist',
        title: 'Bouquets, boutonnieres, centerpieces',
        qty: 1,
        unitPrice: 2000,
        total: 2000,
        vendorId: vendor.id,
      });
      break;
    default:
      lines.push({
        id: `${vendor.category}-service`,
        category: vendor.category,
        title: `${vendor.category} services`,
        qty: 1,
        unitPrice: 1000,
        total: 1000,
        vendorId: vendor.id,
      });
  }

  return {
    id: `prop-${Date.now()}-${vendor.id}`,
    eventId: event.id,
    vendorId: vendor.id,
    vendorName: vendor.name,
    status: 'draft',
    lines,
    createdAt: now,
    lastUpdated: now,
    notes: `AI-generated proposal for ${vendor.name}. Review scope, pricing, and terms before sending.`,
  };
}

export async function aiProposalFromCategory(event: EventItem, category: VendorCategory): Promise<Proposal> {
  const now = new Date().toISOString();
  const guestCount = event.guests?.length || 100;
  
  const lines: ProposalLine[] = [];
  const titleMap: Record<VendorCategory, string> = {
    venue: 'Venue rental',
    catering: `Full-service catering (${guestCount} guests)`,
    photo: 'Photography coverage',
    video: 'Videography services',
    music: 'DJ/MC services',
    florist: 'Floral arrangements',
    decor: 'Decor & rentals',
    officiant: 'Officiant services',
    transport: 'Transportation',
    cake: 'Wedding cake',
    planner: 'Event planning services',
    other: 'Services',
  };

  const priceMap: Record<VendorCategory, number> = {
    venue: 5000,
    catering: guestCount * 75,
    photo: 3000,
    video: 2500,
    music: 1500,
    florist: 2000,
    decor: 1500,
    officiant: 500,
    transport: 800,
    cake: 500,
    planner: 2000,
    other: 1000,
  };

  lines.push({
    id: `line-${category}`,
    category,
    title: titleMap[category],
    qty: category === 'catering' ? guestCount : 1,
    unitPrice: category === 'catering' ? 75 : priceMap[category],
    total: priceMap[category],
  });

  return {
    id: `prop-${Date.now()}-${category}`,
    eventId: event.id,
    status: 'draft',
    lines,
    createdAt: now,
    lastUpdated: now,
    notes: `AI-generated proposal for ${category} services. Review and assign to a vendor before sending.`,
  };
}

export async function aiContractFromProposal(event: EventItem, proposal: Proposal): Promise<Contract> {
  const now = new Date().toISOString();
  const totalValue = proposal.lines.reduce((sum, line) => sum + (line.total ?? (line.qty ?? 0) * (line.unitPrice ?? 0)), 0);
  
  // Build scope from proposal lines
  const scopeLines = proposal.lines.map(l => `- ${l.title}${l.qty ? ` (Qty: ${l.qty})` : ''}${l.total ? ` - $${l.total.toLocaleString()}` : ''}`).join('\n');
  
  return {
    id: `contract-${proposal.id}`,
    eventId: event.id,
    fromProposalId: proposal.id,
    counterparty: proposal.vendorName || 'Vendor',
    status: 'draft',
    lastUpdated: now,
    value: totalValue > 0 ? totalValue : undefined,
    clauses: [
      { id:'c-scope', title:'Scope of Work', body:`Services and deliverables as described in the accepted proposal:\n\n${scopeLines}\n\nTotal Contract Value: $${totalValue.toLocaleString()}` },
      { id:'c-payment', title:'Payment Terms', body:'50% deposit on signing; balance due 7 days before event.' },
      { id:'c-cxl', title:'Cancellation', body:'Refund schedule; force majeure applies.' },
      { id:'c-liability', title:'Liability', body:'Standard indemnification and insurance.' },
    ],
  };
}

export async function aiBudgetAssist(event: EventItem): Promise<BudgetSnapshot> {
  const total = event.budget?.total ?? 30000;
  const allocations: BudgetAllocation[] = [
    { category: toVendorCategory('venue'), planned: total*0.25, actual: null },
    { category: toVendorCategory('catering'), planned: total*0.30, actual: null },
    { category: toVendorCategory('photo'), planned: total*0.08, actual: null },
    { category: toVendorCategory('music'), planned: total*0.06, actual: null },
    { category: toVendorCategory('florist'), planned: total*0.07, actual: null },
    { category: toVendorCategory('decor'), planned: total*0.08, actual: null },
    { category: toVendorCategory('other'), planned: total*0.16, actual: null },
  ];
  return { total, spent: event.budget?.spent ?? 0, remaining: total - (event.budget?.spent ?? 0), allocations };
}

export async function aiGuestSeed(_event: EventItem): Promise<Guest[]> {
  // Provide a small scaffold to start from
  return [{ id:'g1', name:'Alex Johnson', email:'alex@example.com', rsvp:'maybe' }];
}

export async function aiPlanTasks(event: EventItem): Promise<{tasks: Task[]; milestones: Milestone[]}> {
  const baseDate = new Date(event.date);
  const day = (n:number)=> new Date(baseDate.getTime() - n*86400000).toISOString().slice(0,10);
  const tasks: Task[] = [
    { id:'t1', title:'Confirm venue', due: day(60), done:false, linkedTo:'vendor', linkedId:'venue', priority:'high' },
    { id:'t2', title:'Send proposals', due: day(55), done:false, linkedTo:'proposal', priority:'med' },
    { id:'t3', title:'Collect deposits', due: day(45), done:false, linkedTo:'contract', priority:'med' },
    { id:'t4', title:'Finalize guest list', due: day(21), done:false, linkedTo:'guest', priority:'med' },
    { id:'t5', title:'Book photographer', due: day(50), done:false, linkedTo:'milestone', linkedId:'m2', priority:'high' },
    { id:'t6', title:'Order flowers', due: day(30), done:false, linkedTo:'milestone', linkedId:'m2', priority:'med' },
  ];
  return {
    tasks,
    milestones: [
      { id:'m1', title:'Venue secured', targetDate: day(58), critical:true, linkedTaskIds:['t1'] },
      { id:'m2', title:'Vendors confirmed', targetDate: day(40), critical:true, linkedTaskIds:['t5','t6'] },
    ]
  };
}

