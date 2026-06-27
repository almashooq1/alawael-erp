const express = require('express');

class ParentPortalController {
  async getChildProfile(req, res) {
    res.status(200).json({ status: 'ok', data: {} });
  }
  async getChildProgress(req, res) {
    res.status(200).json({ status: 'ok', data: {} });
  }
  async getHomePrograms(req, res) {
    res.status(200).json({ status: 'ok', data: [] });
  }
  async completeHomeProgram(req, res) {
    res.status(200).json({ status: 'ok', message: 'completed' });
  }
  async getChildSessions(req, res) {
    res.status(200).json({ status: 'ok', data: [] });
  }
  async getChildReports(req, res) {
    res.status(200).json({ status: 'ok', data: [] });
  }
  async getMessages(req, res) {
    res.status(200).json({ status: 'ok', data: [] });
  }
  async sendMessage(req, res) {
    res.status(200).json({ status: 'ok', message: 'sent' });
  }
}

module.exports = new ParentPortalController();
