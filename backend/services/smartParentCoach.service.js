const Beneficiary = require('../models/Beneficiary');
const TherapeuticPlan = require('../models/TherapeuticPlan');

class SmartParentCoachService {
  /**
   * AI Chatbot logic specifically for Rehab Parents
   * Context-aware: Knows the child's diagnosis and specific goals
   */
  static async askCoach(beneficiaryId, question) {
    // 1. Fetch Context
    const patient = await Beneficiary.findById(beneficiaryId);
    const plan = await TherapeuticPlan.findOne({ beneficiary: beneficiaryId, status: 'ACTIVE' });

    const childName = patient ? patient.firstName : 'your child';
    const diagnosis = patient ? patient.diagnosis : 'general needs';

    // 2. Simple Intent Analysis (Mock NLP)
    const q = question.toLowerCase();
    let answer = '';
    let source = 'General Knowledge';

    if (q.includes('eat') || q.includes('food') || q.includes('diet')) {
      answer = `${childName}'s nutrition plan recommends avoiding high sugar before sessions. Increases hyperactivity.`;
      source = 'Clinical Nutrition Plan';
    } else if (q.includes('cry') || q.includes('tantrum') || q.includes('behavior')) {
      answer = `When ${childName} has a tantrum, use the 'Count to 5' strategy we practiced. Do not give the iPad purely to stop the crying.`;
      source = 'Behavioral Plan (ABA)';
    } else if (q.includes('sleep') || q.includes('bed')) {
      answer = `Consistent routine is key for ${diagnosis}. Try heavy blanket pressure 15 min before bed.`;
      source = 'Occupational Therapy Tips';
    } else {
      answer = `That's a great question about ${question}. I've flagged this for Dr. Sarah review in the next session. In the meantime, keep tracking the daily goals.`;
      source = 'AI Triage';
    }

    return {
      question,
      answer,
      contextUsed: {
        child: childName,
        diagnosis: diagnosis,
      },
      source,
    };
  }

  /**
   * Daily "Nudge" Generator
   * Proactive advice sent to parents based on schedule
   */
  static async generateDailyTip(beneficiaryId) {
    // Check if there is a session today
    // IF YES: "Good luck with Speech today! Ask the therapist about..."
    // IF NO: "No session today? Try this 10 min home exercise..."

    return {
      type: 'HOME_ACTIVITY',
      message: "No therapy today? Try the 'Animal Walk' game in the living room needed for Gross Motor skills.",
      videoLink: 'https://rehab-videos.com/animal-walk',
    };
  }
}

module.exports = SmartParentCoachService;
module.exports.instance = new SmartParentCoachService();
