"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReportToSlack = sendReportToSlack;
exports.sendReportToTeams = sendReportToTeams;
// report-notifiers.ts
const slack_notifier_1 = require("./slack-notifier");
const teams_notifier_1 = require("./teams-notifier");
async function sendReportToSlack(text, webhookUrl) {
    if (webhookUrl) {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
    }
    else {
        await (0, slack_notifier_1.sendSlackMessage)(text);
    }
}
async function sendReportToTeams(text, webhookUrl) {
    if (webhookUrl) {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
    }
    else {
        await (0, teams_notifier_1.sendTeamsMessage)(text);
    }
}
