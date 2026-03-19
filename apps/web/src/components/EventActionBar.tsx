'use client';

import { Store, FileSignature, ScrollText, Wallet, Users, CheckSquare, Flag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Tab = 'vendors'|'proposals'|'contracts'|'budget'|'guests'|'tasks'|'milestones';

export default function EventActionBar({ tab, setTab }:{ tab: Tab; setTab: (t:Tab)=>void }) {
  const Item = ({ id, label, Icon }: { id: Tab; label: string; Icon: LucideIcon }) => (
    <button
      onClick={() => setTab(id)}
      className={[
        'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition border',
        tab === id ? 'bg-[color:var(--oh-primary)] text-white border-transparent' : 'bg-white hover:bg-slate-50'
      ].join(' ')}
      aria-current={tab===id ? 'page' : undefined}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
  return (
    <div className="sticky top-[64px] z-30 bg-[color:var(--oh-bg)]/70 backdrop-blur border-b">
      <div className="px-4 py-3 flex flex-wrap items-center gap-2">
        <Item id="vendors"   label="Vendors"   Icon={Store} />
        <Item id="proposals" label="Proposals" Icon={FileSignature} />
        <Item id="contracts" label="Contracts" Icon={ScrollText} />
        <Item id="budget"    label="Budget"    Icon={Wallet} />
        <Item id="guests"    label="Guests"    Icon={Users} />
        <Item id="tasks"     label="Tasks"     Icon={CheckSquare} />
        <Item id="milestones"label="Milestones"Icon={Flag} />
      </div>
    </div>
  );
}

