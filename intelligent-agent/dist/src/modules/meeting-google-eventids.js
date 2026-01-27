"use strict";
// Per-user Google Calendar eventId storage for meetings
// This module stores and retrieves eventIds for each meeting/user pair
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMeetingEventId = setMeetingEventId;
exports.getMeetingEventId = getMeetingEventId;
exports.removeMeetingEventId = removeMeetingEventId;
exports.removeAllMeetingEventIds = removeAllMeetingEventIds;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const EVENTIDS_PATH = path_1.default.join(__dirname, '../../data/meeting-google-eventids.json');
function loadEventIds() {
    if (!fs_1.default.existsSync(EVENTIDS_PATH))
        return {};
    try {
        return JSON.parse(fs_1.default.readFileSync(EVENTIDS_PATH, 'utf-8'));
    }
    catch {
        return {};
    }
}
function saveEventIds(map) {
    fs_1.default.writeFileSync(EVENTIDS_PATH, JSON.stringify(map, null, 2), 'utf-8');
}
function setMeetingEventId(meetingId, userId, eventId) {
    const map = loadEventIds();
    if (!map[meetingId])
        map[meetingId] = {};
    map[meetingId][userId] = eventId;
    saveEventIds(map);
}
function getMeetingEventId(meetingId, userId) {
    const map = loadEventIds();
    return map[meetingId]?.[userId] || null;
}
function removeMeetingEventId(meetingId, userId) {
    const map = loadEventIds();
    if (map[meetingId]) {
        delete map[meetingId][userId];
        if (Object.keys(map[meetingId]).length === 0)
            delete map[meetingId];
        saveEventIds(map);
    }
}
function removeAllMeetingEventIds(meetingId) {
    const map = loadEventIds();
    if (map[meetingId]) {
        delete map[meetingId];
        saveEventIds(map);
    }
}
