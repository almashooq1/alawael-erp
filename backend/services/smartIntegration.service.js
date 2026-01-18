/**
 * Smart Interoperability & Integration Service (Phase 68)
 *
 * Bridges the ERP with external ecosystems (Government, Insurance, Global Standards).
 * Handles HL7/FHIR conversion and Government API Simulation.
 */

class SmartIntegrationService {
  /**
   * Convert Internal Patient Data to FHIR (Standard v4)
   * Useful for sending data to other hospitals or unified health records.
   */
  convertToFHIR(patient) {
    // Mapping internal schema to FHIR R4 Patient Resource
    return {
      resourceType: 'Patient',
      id: patient.id,
      active: true,
      name: [
        {
          use: 'official',
          family: patient.lastName,
          given: [patient.firstName, patient.middleName || ''],
        },
      ],
      telecom: [
        {
          system: 'phone',
          value: patient.phone,
          use: 'mobile',
        },
      ],
      gender: patient.gender === 'M' ? 'male' : 'female',
      birthDate: patient.dateOfBirth ? patient.dateOfBirth.toISOString().split('T')[0] : null,
      identifier: [
        {
          use: 'official',
          type: { text: 'National ID' },
          system: 'urn:oid:2.16.840.1.113883.4.1',
          value: patient.nationalId,
        },
      ],
    };
  }

  /**
   * Simulate Data Submission to Ministry of Health (MoH)
   * e.g., Sick Leave, Vaccinations, Mandatory Reporting
   */
  async submitToMoH(payloadType, data) {
    // Simulate external API call latency
    await new Promise(resolve => setTimeout(resolve, 800));

    console.log(`[INTEGRATION] Sending ${payloadType} to MoH Gateway...`);

    // Validate mandatory fields
    if (!data.nationalId) {
      throw new Error('MoH Validation Failed: National ID is required');
    }

    return {
      transactionId: 'MOH-' + Date.now(),
      status: 'ACCEPTED',
      message: 'Record successfully registered in National Health Registry',
      ackDate: new Date(),
    };
  }

  /**
   * Generate e-Claim for Insurance Companies
   * Formats clinical and financial data for reimbursement.
   */
  async generateInsuranceClaim(invoiceId, services) {
    const total = services.reduce((sum, s) => sum + s.price, 0);

    return {
      claimId: `CLM-${invoiceId}`,
      providerId: 'PRV-998877', // Our Center ID
      type: 'PROFESSIONAL',
      priority: 'NORMAL',
      services: services.map(s => ({
        code: s.cptCode, // CPT Code
        description: s.name,
        unitPrice: s.price,
        quantity: 1,
        diagnosisRef: 'ICD-10-F84.0', // Autism code example
      })),
      totalClaimed: total,
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = SmartIntegrationService;
