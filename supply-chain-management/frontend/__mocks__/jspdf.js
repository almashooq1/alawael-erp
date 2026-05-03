/**
 * Mock for jspdf module used in tests.
 * jspdf ships ESM-only and breaks Jest's CJS transformer; component
 * tests don't actually need real PDF generation.
 */
class jsPDF {
  constructor() {
    this.internal = { pageSize: { getWidth: () => 595, getHeight: () => 842 } };
  }
  text() {
    return this;
  }
  setFontSize() {
    return this;
  }
  setFont() {
    return this;
  }
  addPage() {
    return this;
  }
  save() {
    return this;
  }
  output() {
    return '';
  }
  addFileToVFS() {
    return this;
  }
  addFont() {
    return this;
  }
  setLanguage() {
    return this;
  }
  setR2L() {
    return this;
  }
}

module.exports = { jsPDF, default: jsPDF };
module.exports.jsPDF = jsPDF;
