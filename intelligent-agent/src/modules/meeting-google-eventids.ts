// Per-user Google Calendar eventId storage for meetings
// This module stores and retrieves eventIds for each meeting/user pair

import fs from 'fs';
import path from 'path';

const EVENTIDS_PATH = path.join(__dirname, '../../data/meeting-google-eventids.json');

export interface MeetingEventIdMap {
  [meetingId: string]: {
    [userId: string]: string; // eventId
  };
}

function loadEventIds(): MeetingEventIdMap {
  if (!fs.existsSync(EVENTIDS_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(EVENTIDS_PATH, 'utf-8')); } catch { return {}; }
}
function saveEventIds(map: MeetingEventIdMap) {
  fs.writeFileSync(EVENTIDS_PATH, JSON.stringify(map, null, 2), 'utf-8');
}

export function setMeetingEventId(meetingId: string, userId: string, eventId: string) {
  const map = loadEventIds();
  if (!map[meetingId]) map[meetingId] = {};
  map[meetingId][userId] = eventId;
  saveEventIds(map);
}
export function getMeetingEventId(meetingId: string, userId: string): string | null {
  const map = loadEventIds();
  return map[meetingId]?.[userId] || null;
}
export function removeMeetingEventId(meetingId: string, userId: string) {
  const map = loadEventIds();
  if (map[meetingId]) {
    delete map[meetingId][userId];
    if (Object.keys(map[meetingId]).length === 0) delete map[meetingId];
    saveEventIds(map);
  }
}
export function removeAllMeetingEventIds(meetingId: string) {
  const map = loadEventIds();
  if (map[meetingId]) {
    delete map[meetingId];
    saveEventIds(map);
  }
}
