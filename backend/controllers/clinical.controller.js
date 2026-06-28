class ClinicalController {
  async getDashboard(req, res) {
    res.status(200).json({ status: 'ok', data: [] });
  }
  async getSummary(req, res) {
    res.status(200).json({ status: 'ok', data: {} });
  }
  async getTimeline(req, res) {
    res.status(200).json({ status: 'ok', data: [] });
  }
  async getReports(req, res) {
    res.status(200).json({ status: 'ok', data: [] });
  }
}

module.exports = new ClinicalController();
