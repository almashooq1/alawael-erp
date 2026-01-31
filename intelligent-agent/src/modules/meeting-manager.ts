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
  createdAt?: string;
  updatedAt?: string;
}

const MEETINGS_PATH = path.join(__dirname, '../../data/meetings.json');

// Ensure data directory exists
function ensureDataDirectory() {
  const dir = path.dirname(MEETINGS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadMeetings(): Meeting[] {
  ensureDataDirectory();
  if (!fs.existsSync(MEETINGS_PATH)) return [];
  try {
    const data = fs.readFileSync(MEETINGS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading meetings:', error);
    return [];
  }
}

function saveMeetings(meetings: Meeting[]) {
  try {
    ensureDataDirectory();
    fs.writeFileSync(MEETINGS_PATH, JSON.stringify(meetings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving meetings:', error);
    throw new Error('Failed to save meetings');
  }
}

export class MeetingManager {
  listMeetings() {
    try {
      return loadMeetings();
    } catch (error) {
      console.error('Error listing meetings:', error);
      return [];
    }
  }

  getMeeting(id: string) {
    try {
      return loadMeetings().find(m => m.id === id);
    } catch (error) {
      console.error(`Error getting meeting ${id}:`, error);
      return undefined;
    }
  }

  createMeeting(data: Omit<Meeting, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { status?: Meeting['status'] }) {
    try {
      const meetings = loadMeetings();
      const now = new Date().toISOString();
      const meeting: Meeting = {
        id: 'M' + Math.random().toString(36).slice(2, 10),
        status: data.status || 'scheduled',
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      meetings.push(meeting);
      saveMeetings(meetings);
      console.log(`Meeting created: ${meeting.id}`);
      return meeting;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  updateMeeting(id: string, data: Partial<Omit<Meeting, 'id' | 'createdAt'>>) {
    try {
      const meetings = loadMeetings();
      const idx = meetings.findIndex(m => m.id === id);
      if (idx === -1) {
        throw new Error(`Meeting ${id} not found`);
      }
      meetings[idx] = {
        ...meetings[idx],
        ...data,
        updatedAt: new Date().toISOString()
      };
      saveMeetings(meetings);
      console.log(`Meeting updated: ${id}`);
      return meetings[idx];
    } catch (error) {
      console.error(`Error updating meeting ${id}:`, error);
      throw error;
    }
  }

  deleteMeeting(id: string) {
    try {
      const meetings = loadMeetings();
      const filtered = meetings.filter(m => m.id !== id);
      if (filtered.length === meetings.length) {
        throw new Error(`Meeting ${id} not found`);
      }
      saveMeetings(filtered);
      console.log(`Meeting deleted: ${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting meeting ${id}:`, error);
      throw error;
    }
  }
}
