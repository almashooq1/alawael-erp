// Customer Satisfaction Survey Module
// Simple in-memory survey storage for demo. In production, use a DB or external service.
export interface TicketSurvey {
  id: string;
  ticketId: string;
  rating: number; // 1-5
  comment?: string;
  submittedAt: string;
}

export class TicketSurveyManager {
  private surveys: TicketSurvey[] = [];

  submitSurvey(ticketId: string, rating: number, comment?: string): TicketSurvey {
    const survey: TicketSurvey = {
      id: Math.random().toString(36).slice(2),
      ticketId,
      rating,
      comment,
      submittedAt: new Date().toISOString(),
    };
    this.surveys.push(survey);
    return survey;
  }

  getSurveysForTicket(ticketId: string): TicketSurvey[] {
    return this.surveys.filter(s => s.ticketId === ticketId);
  }

  getAllSurveys(): TicketSurvey[] {
    return this.surveys;
  }
}
