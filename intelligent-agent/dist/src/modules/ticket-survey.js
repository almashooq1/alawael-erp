"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketSurveyManager = void 0;
class TicketSurveyManager {
    constructor() {
        this.surveys = [];
    }
    submitSurvey(ticketId, rating, comment) {
        const survey = {
            id: Math.random().toString(36).slice(2),
            ticketId,
            rating,
            comment,
            submittedAt: new Date().toISOString(),
        };
        this.surveys.push(survey);
        return survey;
    }
    getSurveysForTicket(ticketId) {
        return this.surveys.filter(s => s.ticketId === ticketId);
    }
    getAllSurveys() {
        return this.surveys;
    }
}
exports.TicketSurveyManager = TicketSurveyManager;
