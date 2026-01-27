"use strict";
// Meeting Management Module
// Provides meeting creation, scheduling, participant management, and minutes
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const MEETINGS_PATH = path_1.default.join(__dirname, '../../data/meetings.json');
function loadMeetings() {
    if (!fs_1.default.existsSync(MEETINGS_PATH))
        return [];
    try {
        return JSON.parse(fs_1.default.readFileSync(MEETINGS_PATH, 'utf-8'));
    }
    catch {
        return [];
    }
}
function saveMeetings(meetings) {
    fs_1.default.writeFileSync(MEETINGS_PATH, JSON.stringify(meetings, null, 2), 'utf-8');
}
class MeetingManager {
    listMeetings() {
        return loadMeetings();
    }
    getMeeting(id) {
        return loadMeetings().find(m => m.id === id);
    }
    createMeeting(data) {
        const meetings = loadMeetings();
        const meeting = {
            id: 'M' + Math.random().toString(36).slice(2, 10),
            status: data.status || 'scheduled',
            ...data,
        };
        meetings.push(meeting);
        saveMeetings(meetings);
        return meeting;
    }
    updateMeeting(id, data) {
        const meetings = loadMeetings();
        const idx = meetings.findIndex(m => m.id === id);
        if (idx === -1)
            return null;
        meetings[idx] = { ...meetings[idx], ...data };
        saveMeetings(meetings);
        return meetings[idx];
    }
    deleteMeeting(id) {
        let meetings = loadMeetings();
        const before = meetings.length;
        meetings = meetings.filter(m => m.id !== id);
        saveMeetings(meetings);
        return meetings.length < before;
    }
}
exports.MeetingManager = MeetingManager;
