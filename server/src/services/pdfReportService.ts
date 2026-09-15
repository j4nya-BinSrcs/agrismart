import PDFDocument from 'pdfkit';
import { EXPERT_ADVISORY_ASSESSMENT_LABEL } from './diagnosisService.js';

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

const EMPHASIS = '#166534'; // emerald-800, AgriSmart brand accent
const MUTED = '#64748b'; // slate-500
const DARK = '#1e293b'; // slate-800
const LIGHT = '#f1f5f9'; // slate-100
const ROSE = '#b91c1c'; // rose-700

interface ReportRecord {
  id?: string;
  crop?: string;
  variety?: string;
  growthStage?: string;
  diseaseName?: string;
  pathogenName?: string;
  isHealthy?: boolean;
  confidence?: number;
  severity?: string;
  detectedAt?: string;
  fieldLocation?: string;
  shortExplanation?: string;
  symptomsMatched?: string[];
  symptomsRuledOut?: string[];
  treatmentProtocols?: {
    organic?: string;
    conventional?: string;
    dosage?: string;
    applicationTiming?: string;
  };
  precautions?: string[];
  recommendedActions?: { step?: number; title?: string; description?: string; timing?: string }[];
  relatedInsights?: {
    weatherRisk?: string;
    irrigationAdvice?: string;
    sustainabilityImpact?: string;
  };
  imageUrl?: string;
  isMlPrediction?: boolean;
}

const sectionTitle = (doc: PDFKit.PDFDocument, title: string) => {
  doc
    .fillColor(EMPHASIS)
    .font('Helvetica-Bold')
    .fontSize(12)
    .text(title, { continued: false });
  doc
    .moveDown(0.4)
    .moveTo(doc.x, doc.y - 6)
    .lineTo(doc.page.width - 60, doc.y - 6)
    .lineWidth(1)
    .strokeColor(LIGHT)
    .stroke()
    .moveDown(0.4);
};

const labelValue = (doc: PDFKit.PDFDocument, label: string, value: string) => {
  if (!value) return;
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(9).text(label);
  doc.fillColor(DARK).font('Helvetica').text(String(value)).moveDown(0.3);
};

/**
 * Decodes a base64 data-URI image into a Buffer + mime type so it can be
 * embedded in the PDF. Returns null for unsupported formats (pdfkit embeds
 * JPEG and PNG; WebP/SVG are skipped gracefully).
 */
const decodeReportImage = (
  imageUrl: string
): { buffer: Buffer; mime: string } | null => {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const match = imageUrl.match(/^data:(image\/(?:jpeg|jpg|png));base64,(.+)$/);
  if (!match) return null;
  try {
    const mime = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
    return { buffer: Buffer.from(match[2], 'base64'), mime };
  } catch {
    return null;
  }
};

/**
 * Generates a professional single-page (multi-page if needed) diagnostic
 * report PDF for a diagnosis record and returns the bytes as a Buffer.
 */
export const buildDiagnosisReportPdf = async (record: ReportRecord): Promise<Buffer> => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 60,
    bufferPages: true,
    info: {
      Title: `AgriSmart Diagnosis Report — ${record.diseaseName || 'Crop'}`,
      Author: 'AgriSmart AI',
      Subject: 'Crop Disease Diagnostic Report',
      Producer: 'AgriSmart AI Backend',
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<void>((resolve, reject) => {
    doc.on('end', resolve);
    doc.on('error', reject);
  });

  // ------------------------------------------------------------------
  // Header band
  // ------------------------------------------------------------------
  doc
    .rect(0, 0, doc.page.width, 34)
    .fill(EMPHASIS);
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(16)
    .text('AgriSmart AI', 60, 10)
    .font('Helvetica')
    .fontSize(9)
    .text('Crop Health Diagnostic Report', 60, 32, { characterSpacing: 0.5 });

  doc.moveDown(1.6);

  // ------------------------------------------------------------------
  // Diagnosis summary card
  // ------------------------------------------------------------------
  const isMl = record.isMlPrediction === true;
  const isAdvisory =
    !isMl || record.diseaseName === EXPERT_ADVISORY_ASSESSMENT_LABEL;

  const diagnosisTitle = record.diseaseName || 'Crop Assessment';
  doc
    .fillColor(DARK)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text(diagnosisTitle, { lineGap: 2 });
  doc
    .fillColor(isAdvisory ? ROSE : EMPHASIS)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(
      isAdvisory
        ? 'EXPERT ADVISORY ASSESSMENT — RULE-BASED GUIDANCE (NOT AN AUTOMATED DISEASE IDENTIFICATION)'
        : 'CLASSIFIED BY THE CHLOROMAP COMPUTER-VISION MODEL',
      { characterSpacing: 0.4 }
    )
    .moveDown(0.5);

  if (record.pathogenName) {
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(9)
      .text(`Pathogen: ${record.pathogenName}`)
      .moveDown(0.3);
  }

  doc.moveDown(0.3);

  // Meta grid (label/value) rows
  const metaRows: [string, string][] = [
    ['Crop', `${record.crop || '—'}${record.variety ? ` (${record.variety})` : ''}`],
    ['Growth Stage', record.growthStage || '—'],
    ['Field Location', record.fieldLocation || '—'],
    ['Detected At', record.detectedAt ? new Date(record.detectedAt).toLocaleString() : '—'],
    ['Severity', record.severity ? record.severity.charAt(0).toUpperCase() + record.severity.slice(1) : '—'],
  ];

  const metaTop = doc.y;
  let labelX = 60;
  metaRows.forEach(([label, value]) => {
    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8.5).text(label, labelX, metaTop, { lineBreak: false });
    doc.fillColor(DARK).font('Helvetica').fontSize(9).text(value, labelX, metaTop + 12, { width: 150 });
    labelX += 132;
  });
  doc.y = metaTop + 34;
  doc.moveDown(0.2);

  // Confidence + Status strip
  doc
    .roundedRect(60, doc.y, 170, 20, 4)
    .fill(LIGHT);
  doc
    .fillColor(DARK)
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .text(
      isAdvisory
        ? 'Status: Advisory Guidance'
        : `Confidence: ${Math.round((record.confidence ?? 0) * 100) / 100}%`,
      60,
      doc.y + 6,
      { width: 170, align: 'center' }
    );
  doc
    .roundedRect(240, doc.y - 20, 170, 20, 4)
    .fill(isAdvisory ? '#fef3c7' : record.isHealthy ? '#d1fae5' : '#fee2e2');
  doc
    .fillColor(isAdvisory ? '#92400e' : record.isHealthy ? '#065f46' : '#991b1b')
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .text(
      isAdvisory ? 'Source: Expert Rules' : record.isHealthy ? 'Status: Healthy' : 'Status: Disease Detected',
      240,
      doc.y + 6,
      { width: 170, align: 'center' }
    );
  doc.y += 10;
  doc.moveDown(1);

  // ------------------------------------------------------------------
  // Leaf image (if embeddable)
  // ------------------------------------------------------------------
  const decoded = decodeReportImage(record.imageUrl || '');
  if (decoded) {
    try {
      doc.image(decoded.buffer, { fit: [120, 120] });
      // Advance past the image vertically before continuing text.
      doc.x = 60;
      doc.y += 120;
    } catch (err) {
      doc
        .fillColor(MUTED)
        .font('Helvetica-Oblique')
        .fontSize(9)
        .text(`[Leaf thumbnail unavailable: ${getErrorMessage(err)}]`);
      doc.moveDown(0.4);
    }
  }

  // ------------------------------------------------------------------
  // Observation summary
  // ------------------------------------------------------------------
  sectionTitle(doc, 'Observation Summary');
  if (record.shortExplanation) {
    doc
      .fillColor(DARK)
      .font('Helvetica')
      .fontSize(9.5)
      .text(record.shortExplanation, { lineGap: 2 });
  }
  doc.moveDown(0.8);

  // ------------------------------------------------------------------
  // Symptoms matched / ruled out
  // ------------------------------------------------------------------
  const hasSymptoms = (record.symptomsMatched && record.symptomsMatched.length) ||
    (record.symptomsRuledOut && record.symptomsRuledOut.length);
  if (hasSymptoms) {
    sectionTitle(doc, 'Diagnostic Differentiation');
    if (record.symptomsMatched && record.symptomsMatched.length) {
      doc
        .fillColor(EMPHASIS)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(`Matched Symptoms (${record.symptomsMatched.length})`, { continued: false });
      record.symptomsMatched.slice(0, 10).forEach((item) => {
        doc
          .fillColor(DARK)
          .font('Helvetica')
          .fontSize(9)
          .text(`• ${item}`, { bulletIndent: 8, width: doc.page.width - 140, lineGap: 1.5 });
      });
      doc.moveDown(0.4);
    }
    if (record.symptomsRuledOut && record.symptomsRuledOut.length) {
      doc
        .fillColor(MUTED)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(`Ruled-out Conditions (${record.symptomsRuledOut.length})`, { continued: false });
      record.symptomsRuledOut.slice(0, 10).forEach((item) => {
        doc
          .fillColor(DARK)
          .font('Helvetica')
          .fontSize(9)
          .text(`• ${item}`, { bulletIndent: 8, width: doc.page.width - 140, lineGap: 1.5 });
      });
    }
    doc.moveDown(0.8);
  }

  // ------------------------------------------------------------------
  // Treatment protocols
  // ------------------------------------------------------------------
  const tp = record.treatmentProtocols;
  if (tp && (tp.organic || tp.conventional)) {
    sectionTitle(doc, 'Treatment Protocols');
    doc
      .fillColor(EMPHASIS)
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .text('Organic / Biological', { continued: false });
    doc
      .fillColor(DARK)
      .font('Helvetica')
      .fontSize(9)
      .text(tp.organic || '—', { lineGap: 1.5 })
      .moveDown(0.3);
    doc
      .fillColor(DARK)
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .text('Conventional', { continued: false });
    doc
      .fillColor(DARK)
      .font('Helvetica')
      .fontSize(9)
      .text(tp.conventional || '—', { lineGap: 1.5 });
    if (tp.dosage || tp.applicationTiming) {
      doc.moveDown(0.2);
      labelValue(doc, 'Dosage', tp.dosage || '');
      labelValue(doc, 'Application Window', tp.applicationTiming || '');
    }
    doc.moveDown(0.6);
  }

  // ------------------------------------------------------------------
  // Recommended actions
  // ------------------------------------------------------------------
  if (record.recommendedActions && record.recommendedActions.length) {
    sectionTitle(doc, 'Recommended Actions');
    record.recommendedActions.forEach((action) => {
      doc
        .fillColor(EMPHASIS)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(`Step ${action.step || 0}: ${action.title || ''}`, { continued: true });
      doc
        .fillColor(MUTED)
        .font('Helvetica-Oblique')
        .fontSize(8)
        .text(`  ${action.timing || ''}`);
      doc
        .fillColor(DARK)
        .font('Helvetica')
        .fontSize(9)
        .text(action.description || '', { width: doc.page.width - 140, lineGap: 1.5 })
        .moveDown(0.25);
    });
    doc.moveDown(0.6);
  }

  // ------------------------------------------------------------------
  // Precautions
  // ------------------------------------------------------------------
  if (record.precautions && record.precautions.length) {
    sectionTitle(doc, 'Field Precautions');
    record.precautions.slice(0, 10).forEach((item) => {
      doc
        .fillColor(DARK)
        .font('Helvetica')
        .fontSize(9)
        .text(`• ${item}`, { bulletIndent: 8, width: doc.page.width - 140, lineGap: 2 });
    });
    doc.moveDown(0.8);
  }

  // ------------------------------------------------------------------
  // Related insights
  // ------------------------------------------------------------------
  const ri = record.relatedInsights;
  if (ri && (ri.weatherRisk || ri.irrigationAdvice || ri.sustainabilityImpact)) {
    sectionTitle(doc, 'Cross-System Implications');
    if (ri.weatherRisk) labelValue(doc, 'Weather Correlation', ri.weatherRisk);
    if (ri.irrigationAdvice) labelValue(doc, 'Irrigation Guidance', ri.irrigationAdvice);
    if (ri.sustainabilityImpact) labelValue(doc, 'Sustainability Impact', ri.sustainabilityImpact);
    doc.moveDown(0.6);
  }

  // ------------------------------------------------------------------
  // Footer / disclaimer
  // ------------------------------------------------------------------
  doc
    .fillColor(LIGHT)
    .moveTo(60, doc.y)
    .lineTo(doc.page.width - 60, doc.y)
    .lineWidth(1)
    .stroke()
    .moveDown(0.6);
  doc
    .fillColor(MUTED)
    .font('Helvetica-Oblique')
    .fontSize(7.5)
    .text(
      'Disclaimer: This report combines computer-vision classification (where available) with validated agronomic guidance ' +
      'from the AgriSmart crop-knowledge base. Classifier confidence is a ranking signal, not verified certainty. ' +
      'For laboratory confirmation or severe outbreaks, consult your district Krishi Vigyan Kendra (KVK) or local extension officer.',
      { width: doc.page.width - 140, lineGap: 2 }
    );
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(7.5)
    .text(
      `Report ID: ${record.id || '—'}  •  Generated by AgriSmart AI  •  ${new Date().toLocaleString()}`,
      60,
      doc.page.height - 50
    );

  doc.end();
  await done;
  return Buffer.concat(chunks);
};

export default buildDiagnosisReportPdf;