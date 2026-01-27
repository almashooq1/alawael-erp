import axios from 'axios';

export class JiraIntegration {
  baseUrl: string;
  email: string;
  apiToken: string;
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
    const res = await axios.post(url, data, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    return res.data;
  }
}

export class ServiceNowIntegration {
  instanceUrl: string;
  username: string;
  password: string;
  constructor({ instanceUrl, username, password }) {
    this.instanceUrl = instanceUrl;
    this.username = username;
    this.password = password;
  }
  async createIncident({ short_description, description }) {
    const url = `${this.instanceUrl}/api/now/table/incident`;
    const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    const data = { short_description, description };
    const res = await axios.post(url, data, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    return res.data;
  }
}
