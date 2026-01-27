// Calendar & Meeting Scheduling Integration Module
// Stubs for calendar/meeting integration (Google, Outlook, etc.)
export interface Meeting {
  id: string;
  ticketId: string;
  title: string;
  start: string;
  end: string;
  attendees: string[];
  location?: string;
  notes?: string;
  createdAt: string;
}

export class MeetingScheduler {
  private meetings: Meeting[] = [];

  schedule(meeting: Omit<Meeting, 'id' | 'createdAt'>) {
    const m: Meeting = { ...meeting, id: Math.random().toString(36).slice(2), createdAt: new Date().toISOString() };
    this.meetings.push(m);
    return m;
  }

  list(ticketId?: string) {
    return ticketId ? this.meetings.filter(m => m.ticketId === ticketId) : this.meetings;
  }

  cancel(id: string) {
    const idx = this.meetings.findIndex(m => m.id === id);
    if (idx >= 0) this.meetings.splice(idx, 1);
    return idx >= 0;
  }
}
