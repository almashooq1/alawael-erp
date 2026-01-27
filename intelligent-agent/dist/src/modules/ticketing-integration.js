"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceNowIntegration = exports.JiraIntegration = void 0;
const axios_1 = __importDefault(require("axios"));
class JiraIntegration {
    constructor({ baseUrl, email, apiToken }) {
        this.baseUrl = baseUrl;
        this.email = email;
        this.apiToken = apiToken;
    }
    async createTicket({ summary, description, projectKey, issueType = 'Task' }) {
        const url = `${this.baseUrl}/rest/api/3/issue`;
        const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
        const data = {
            fields: {
                project: { key: projectKey },
                summary,
                description,
                issuetype: { name: issueType },
            },
        };
        const res = await axios_1.default.post(url, data, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });
        return res.data;
    }
}
exports.JiraIntegration = JiraIntegration;
class ServiceNowIntegration {
    constructor({ instanceUrl, username, password }) {
        this.instanceUrl = instanceUrl;
        this.username = username;
        this.password = password;
    }
    async createIncident({ short_description, description }) {
        const url = `${this.instanceUrl}/api/now/table/incident`;
        const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        const data = { short_description, description };
        const res = await axios_1.default.post(url, data, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });
        return res.data;
    }
}
exports.ServiceNowIntegration = ServiceNowIntegration;
