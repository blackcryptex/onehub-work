'use client';

import { useState } from 'react';

import EventActionBar from '@/components/EventActionBar';
import VendorsPane from '@/components/panes/VendorsPane';
import ProposalsPane from '@/components/panes/ProposalsPane';
import ContractsPane from '@/components/panes/ContractsPane';
import BudgetPane from '@/components/panes/BudgetPane';
import GuestsPane from '@/components/panes/GuestsPane';
import TasksMilestonesPane from '@/components/panes/TasksMilestonesPane';
import { EventItem } from '@/lib/types.event';

type Tab = 'vendors'|'proposals'|'contracts'|'budget'|'guests'|'tasks'|'milestones';

export default function EventManagementSection({ event, onEventChange }:{ event: EventItem; onEventChange:(patch: Partial<EventItem>)=>void }) {
  const [tab, setTab] = useState<Tab>('vendors');

  return (
    <div className="space-y-6">
      <EventActionBar tab={tab} setTab={setTab} />

      {tab==='vendors'   && <VendorsPane   event={event} onUpdate={onEventChange} onNavigateToProposals={() => setTab('proposals')} />}
      {tab==='proposals' && <ProposalsPane event={event} onUpdate={onEventChange} />}
      {tab==='contracts' && <ContractsPane event={event} onUpdate={onEventChange} />}
      {tab==='budget'    && <BudgetPane    event={event} onUpdate={onEventChange} />}
      {tab==='guests'    && <GuestsPane    event={event} onUpdate={onEventChange} />}
      {tab==='tasks'     && <TasksMilestonesPane event={event} onUpdate={onEventChange} initialSubTab="tasks" />}
      {tab==='milestones'&& <TasksMilestonesPane event={event} onUpdate={onEventChange} initialSubTab="milestones" />}
    </div>
  );
}

