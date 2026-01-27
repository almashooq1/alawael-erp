// Meeting Management Module
// Provides meeting creation, scheduling, participant management, and minutes

import fs from 'fs';
import path from 'path';

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  participants: string[];
  agenda: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdBy: string;
}

const MEETINGS_PATH = path.join(__dirname, '../../data/meetings.json');

function loadMeetings(): Meeting[] {
  if (!fs.existsSync(MEETINGS_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(MEETINGS_PATH, 'utf-8')); } catch { return []; }
}
function saveMeetings(meetings: Meeting[]) {
  fs.writeFileSync(MEETINGS_PATH, JSON.stringify(meetings, null, 2), 'utf-8');
}

export class MeetingManager {
  listMeetings() {
    return loadMeetings();
  }
  getMeeting(id: string) {
    return loadMeetings().find(m => m.id === id);
  }
  createMeeting(data: Omit<Meeting, 'id' | 'status'> & { status?: Meeting['status'] }) {
    const meetings = loadMeetings();
    const meeting: Meeting = {
      id: 'M' + Math.random().toString(36).slice(2, 10),
      status: data.status || 'scheduled',
      ...data,
    };
    meetings.push(meeting);
    saveMeetings(meetings);
    return meeting;
  }
  updateMeeting(id: string, data: Partial<Omit<Meeting, 'id'>>) {
    const meetings = loadMeetings();
    const idx = meetings.findIndex(m => m.id === id);
    if (idx === -1) return null;
    meetings[idx] = { ...meetings[idx], ...data };
    saveMeetings(meetings);
    return meetings[idx];
  }
  deleteMeeting(id: string) {
    let meetings = loadMeetings();
    const before = meetings.length;
    meetings = meetings.filter(m => m.id !== id);
    saveMeetings(meetings);
    return meetings.length < before;
  }
}
