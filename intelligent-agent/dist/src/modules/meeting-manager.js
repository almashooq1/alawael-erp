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
// Ensure data directory exists
function ensureDataDirectory() {
    const dir = path_1.default.dirname(MEETINGS_PATH);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
function loadMeetings() {
    ensureDataDirectory();
    if (!fs_1.default.existsSync(MEETINGS_PATH))
        return [];
    try {
        const data = fs_1.default.readFileSync(MEETINGS_PATH, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error('Error loading meetings:', error);
        return [];
    }
}
function saveMeetings(meetings) {
    try {
        ensureDataDirectory();
        fs_1.default.writeFileSync(MEETINGS_PATH, JSON.stringify(meetings, null, 2), 'utf-8');
    }
    catch (error) {
        console.error('Error saving meetings:', error);
        throw new Error('Failed to save meetings');
    }
}
class MeetingManager {
    listMeetings() {
        try {
            return loadMeetings();
        }
        catch (error) {
            console.error('Error listing meetings:', error);
            return [];
        }
    }
    getMeeting(id) {
        try {
            return loadMeetings().find(m => m.id === id);
        }
        catch (error) {
            console.error(`Error getting meeting ${id}:`, error);
            return undefined;
        }
    }
    createMeeting(data) {
        try {
            const meetings = loadMeetings();
            const now = new Date().toISOString();
            const meeting = {
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
        }
        catch (error) {
            console.error('Error creating meeting:', error);
            throw error;
        }
    }
    updateMeeting(id, data) {
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
        }
        catch (error) {
            console.error(`Error updating meeting ${id}:`, error);
            throw error;
        }
    }
    deleteMeeting(id) {
        try {
            const meetings = loadMeetings();
            const filtered = meetings.filter(m => m.id !== id);
            if (filtered.length === meetings.length) {
                throw new Error(`Meeting ${id} not found`);
            }
            saveMeetings(filtered);
            console.log(`Meeting deleted: ${id}`);
            return true;
        }
        catch (error) {
            console.error(`Error deleting meeting ${id}:`, error);
            throw error;
        }
    }
}
exports.MeetingManager = MeetingManager;
