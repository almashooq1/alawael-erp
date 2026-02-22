const express = require('express');
const router = express.Router();
const SmartSubstitutionService = require('../services/smartSubstitution.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/substitution-smart/find
 * @desc Find replacement therapist for a sick/absent staff member
 */
router.post('/find', authorizeRole(['ADMIN', 'receptionist', 'CARE_MANAGER']), async (req, res) => {
  try {
    const { originalTherapistId, date, startTime, endTime, patientId } = req.body;

    if (!originalTherapistId || !date || !startTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const replacements = await SmartSubstitutionService.findReplacement(
      originalTherapistId,
      date,
      startTime,
      endTime || startTime, // Fallback if single slot
      patientId,
    );

    res.json({
      success: true,
      count: replacements.length,
      candidates: replacements,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

