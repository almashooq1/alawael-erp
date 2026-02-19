/**
 * Video & Calendar Integration Service
 * Zoom and Google Calendar Integration
 *
 * Features:
 * - Zoom meeting creation and management
 * - Google Calendar event scheduling
 * - Meeting reminders
 * - Attendee management
 * - Recording management
 */

const axios = require('axios');
const { google } = require('googleapis');
const AuditLogger = require('./audit-logger');
const jwt = require('jsonwebtoken');

class VideoCalendarIntegrationService {
  constructor() {
    this.logger = new AuditLogger('VideoCalendarIntegration');
    this.zoomEnabled = !!process.env.ZOOM_CLIENT_ID;
    this.googleEnabled = !!process.env.GOOGLE_CLIENT_ID;

    // Initialize Zoom credentials
    this.zoomClientId = process.env.ZOOM_CLIENT_ID;
    this.zoomClientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.zoomAccountId = process.env.ZOOM_ACCOUNT_ID;

    // Initialize Google credentials
    this.googleClientId = process.env.GOOGLE_CLIENT_ID;
    this.googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.googleRedirectUri =
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback';

    // Initialize Google Calendar
    if (this.googleEnabled) {
      this.oauth2Client = new google.auth.OAuth2(
        this.googleClientId,
        this.googleClientSecret,
        this.googleRedirectUri
      );
    }
  }

  /**
   * Get Zoom Access Token (Server-to-Server OAuth)
   */
  async getZoomAccessToken() {
    if (!this.zoomEnabled) return null;

    try {
      const payload = {
        iss: this.zoomClientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, this.zoomClientSecret);

      const response = await axios.post(
        'https://zoom.us/oauth/token',
        {},
        {
          params: {
            grant_type: 'account_credentials',
            account_id: this.zoomAccountId,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      this.logger.log('info', 'Zoom access token obtained');
      return response.data.access_token;
    } catch (error) {
      this.logger.log('error', 'Failed to get Zoom access token', { error: error.message });
      throw error;
    }
  }

  /**
   * Create Zoom Meeting
   */
  async createZoomMeeting(meetingData) {
    if (!this.zoomEnabled) {
      return this.mockZoomMeeting(meetingData);
    }

    try {
      const accessToken = await this.getZoomAccessToken();
      const {
        topic,
        description = '',
        startTime,
        duration = 60,
        timezone = 'UTC',
        settings = {},
      } = meetingData;

      const response = await axios.post(
        'https://api.zoom.us/v2/users/me/meetings',
        {
          topic,
          type: 2, // Scheduled meeting
          start_time: startTime,
          duration,
          timezone,
          description,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: true,
            mute_upon_entry: false,
            waiting_room: false,
            ...settings,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log('info', 'Zoom meeting created', {
        meetingId: response.data.id,
        topic,
      });

      return {
        success: true,
        provider: 'zoom',
        meetingId: response.data.id,
        joinUrl: response.data.join_url,
        startUrl: response.data.start_url,
        topic,
        startTime,
        duration,
      };
    } catch (error) {
      this.logger.log('error', 'Failed to create Zoom meeting', { error: error.message });
      throw error;
    }
  }

  /**
   * Get Zoom Meeting Details
   */
  async getZoomMeetingDetails(meetingId) {
    if (!this.zoomEnabled) {
      return { success: true, meetingId, status: 'mock' };
    }

    try {
      const accessToken = await this.getZoomAccessToken();

      const response = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        success: true,
        meeting: response.data,
      };
    } catch (error) {
      this.logger.log('error', 'Failed to get Zoom meeting details', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete Zoom Meeting
   */
  async deleteZoomMeeting(meetingId) {
    if (!this.zoomEnabled) {
      return { success: true, meetingId, status: 'deleted' };
    }

    try {
      const accessToken = await this.getZoomAccessToken();

      await axios.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      this.logger.log('info', 'Zoom meeting deleted', { meetingId });

      return {
        success: true,
        meetingId,
        status: 'deleted',
      };
    } catch (error) {
      this.logger.log('error', 'Failed to delete Zoom meeting', { error: error.message });
      throw error;
    }
  }

  /**
   * Get Zoom Meeting Recordings
   */
  async getZoomRecordings(meetingId) {
    if (!this.zoomEnabled) {
      return { success: true, recordings: [] };
    }

    try {
      const accessToken = await this.getZoomAccessToken();

      const response = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}/recordings`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        success: true,
        recordings: response.data.recording_files || [],
      };
    } catch (error) {
      this.logger.log('error', 'Failed to get recordings', { error: error.message });
      throw error;
    }
  }

  /**
   * Create Google Calendar Event
   */
  async createGoogleCalendarEvent(eventData, userTokens) {
    if (!this.googleEnabled) {
      return this.mockGoogleEvent(eventData);
    }

    try {
      const {
        summary,
        description = '',
        startTime,
        endTime,
        attendees = [],
        location = '',
        reminders = [],
      } = eventData;

      const auth = new google.auth.OAuth2(this.googleClientId, this.googleClientSecret);

      auth.setCredentials(userTokens);

      const calendar = google.calendar({ version: 'v3', auth });

      const event = {
        summary,
        description,
        start: { dateTime: startTime, timeZone: 'UTC' },
        end: { dateTime: endTime, timeZone: 'UTC' },
        location,
        attendees: attendees.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: reminders,
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      this.logger.log('info', 'Google Calendar event created', {
        eventId: response.data.id,
        summary,
      });

      return {
        success: true,
        provider: 'google_calendar',
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        summary,
        startTime,
        endTime,
      };
    } catch (error) {
      this.logger.log('error', 'Failed to create Google Calendar event', { error: error.message });
      throw error;
    }
  }

  /**
   * Update Google Calendar Event
   */
  async updateGoogleCalendarEvent(eventId, eventData, userTokens) {
    if (!this.googleEnabled) {
      return { success: true, eventId, status: 'updated' };
    }

    try {
      const auth = new google.auth.OAuth2(this.googleClientId, this.googleClientSecret);

      auth.setCredentials(userTokens);

      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId,
        resource: eventData,
      });

      this.logger.log('info', 'Google Calendar event updated', { eventId });

      return {
        success: true,
        eventId: response.data.id,
        status: 'updated',
      };
    } catch (error) {
      this.logger.log('error', 'Failed to update Google Calendar event', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete Google Calendar Event
   */
  async deleteGoogleCalendarEvent(eventId, userTokens) {
    if (!this.googleEnabled) {
      return { success: true, eventId, status: 'deleted' };
    }

    try {
      const auth = new google.auth.OAuth2(this.googleClientId, this.googleClientSecret);

      auth.setCredentials(userTokens);

      const calendar = google.calendar({ version: 'v3', auth });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });

      this.logger.log('info', 'Google Calendar event deleted', { eventId });

      return {
        success: true,
        eventId,
        status: 'deleted',
      };
    } catch (error) {
      this.logger.log('error', 'Failed to delete Google Calendar event', { error: error.message });
      throw error;
    }
  }

  /**
   * List Google Calendar Events
   */
  async listGoogleCalendarEvents(options = {}, userTokens) {
    if (!this.googleEnabled) {
      return { success: true, events: [] };
    }

    try {
      const {
        timeMin = new Date().toISOString(),
        timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxResults = 10,
      } = options;

      const auth = new google.auth.OAuth2(this.googleClientId, this.googleClientSecret);

      auth.setCredentials(userTokens);

      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return {
        success: true,
        events: response.data.items || [],
      };
    } catch (error) {
      this.logger.log('error', 'Failed to list Google Calendar events', { error: error.message });
      throw error;
    }
  }

  /**
   * Mock Zoom Meeting (for testing)
   */
  mockZoomMeeting(meetingData) {
    const meetingId = Math.floor(Math.random() * 90000000) + 10000000;
    this.logger.log('info', 'Zoom meeting created (mock mode)', { meetingId });

    return {
      success: true,
      provider: 'zoom_mock',
      meetingId,
      joinUrl: `https://zoom.us/j/${meetingId}`,
      startUrl: `https://zoom.us/s/${meetingId}`,
      topic: meetingData.topic,
      startTime: meetingData.startTime,
      duration: meetingData.duration || 60,
    };
  }

  /**
   * Mock Google Event (for testing)
   */
  mockGoogleEvent(eventData) {
    this.logger.log('info', 'Google Calendar event created (mock mode)');

    return {
      success: true,
      provider: 'google_calendar_mock',
      eventId: `MOCK-${Date.now()}`,
      htmlLink: 'https://calendar.google.com/',
      summary: eventData.summary,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
    };
  }
}

module.exports = new VideoCalendarIntegrationService();
