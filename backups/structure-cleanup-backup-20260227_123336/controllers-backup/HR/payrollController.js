// HR Payroll Controller
const Payroll = require('../../models/HR/Payroll');

// Create new payroll
exports.createPayroll = async (req, res) => {
  try {
    const payroll = new Payroll(req.body);
    await payroll.save();
    res.status(201).json(payroll);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all payrolls
exports.getPayrolls = async (req, res) => {
  try {
    const payrolls = await Payroll.find();
    res.json(payrolls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get payroll by ID
exports.getPayrollById = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ error: 'Not found' });
    res.json(payroll);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update payroll
exports.updatePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!payroll) return res.status(404).json({ error: 'Not found' });
    res.json(payroll);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete payroll
exports.deletePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndDelete(req.params.id);
    if (!payroll) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
