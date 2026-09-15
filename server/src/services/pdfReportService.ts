import PDFDocument from 'pdfkit';
import { EXPERT_ADVISORY_ASSESSMENT_LABEL } from './diagnosisService.js';

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

const EMPHASIS = '#166534'; // emerald-800, AgriSmart brand accent
const MUTED = '#64748b'; // slate-500
const DARK = '#1e293b'; // slate-800
const LIGHT = '#f1f5f9'; // slate-100
const ROSE = '#b91c1c'; // rose-700

const MARGIN = 42;
const CONTENT_WIDTH = 595.28 - MARGIN * 2; // A4 width minus margins

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
    .fontSize(10)
    .text(title, { continued: false });
  doc
    .moveDown(0.2)
    .moveTo(doc.x, doc.y - 5)
    .lineTo(doc.page.width - MARGIN, doc.y - 5)
    .lineWidth(0.8)
    .strokeColor(LIGHT)
    .stroke()
    .moveDown(0.25);
};

const labelValue = (doc: PDFKit.PDFDocument, label: string, value: string) => {
  if (!value) return;
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7.5).text(label);
  doc.fillColor(DARK).font('Helvetica').fontSize(8).text(String(value)).moveDown(0.2);
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
 * Generates a compact, professional diagnostic report PDF for a diagnosis
 * record and returns the bytes as a Buffer. Tight margins and dense typography
 * keep typical reports on a single A4 page.
 */
export const buildDiagnosisReportPdf = async (record: ReportRecord): Promise<Buffer> => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
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
    .rect(0, 0, doc.page.width, 26)
    .fill(EMPHASIS);
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(13)
    .text('AgriSmart AI', MARGIN, 6)
    .font('Helvetica')
    .fontSize(8)
    .text('Crop Health Diagnostic Report', MARGIN, 26, { characterSpacing: 0.4 });

  doc.moveDown(1.1);

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
    .fontSize(15)
    .text(diagnosisTitle, { lineGap: 1 });
  doc
    .fillColor(isAdvisory ? ROSE : EMPHASIS)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(
      isAdvisory
        ? 'EXPERT ADVISORY ASSESSMENT — RULE-BASED GUIDANCE (NOT AN AUTOMATED DISEASE IDENTIFICATION)'
        : 'CLASSIFIED BY THE CHLOROMAP COMPUTER-VISION MODEL',
      { characterSpacing: 0.3 }
    )
    .moveDown(0.3);

  if (record.pathogenName) {
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(8)
      .text(`Pathogen: ${record.pathogenName}`)
      .moveDown(0.2);
  }

  doc.moveDown(0.2);

  // Meta grid (label/value) rows
  const metaRows: [string, string][] = [
    ['Crop', `${record.crop || '—'}${record.variety ? ` (${record.variety})` : ''}`],
    ['Growth Stage', record.growthStage || '—'],
    ['Field Location', record.fieldLocation || '—'],
    ['Detected At', record.detectedAt ? new Date(record.detectedAt).toLocaleString() : '—'],
    ['Severity', record.severity ? record.severity.charAt(0).toUpperCase() + record.severity.slice(1) : '—'],
  ];

  const metaTop = doc.y;
  let labelX = MARGIN;
  metaRows.forEach(([label, value]) => {
    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7).text(label, labelX, metaTop, { lineBreak: false });
    doc.fillColor(DARK).font('Helvetica').fontSize(8).text(value, labelX, metaTop + 9.5, { width: 100 });
    labelX += 103;
  });
  doc.y = metaTop + 22;
  doc.moveDown(0.1);

  // Confidence + Status strip
  doc
    .roundedRect(MARGIN, doc.y, 150, 16, 3)
    .fill(LIGHT);
  doc
    .fillColor(DARK)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(
      isAdvisory
        ? 'Status: Advisory Guidance'
        : `Confidence: ${Math.round((record.confidence ?? 0) * 100) / 100}%`,
      MARGIN,
      doc.y + 4.5,
      { width: 150, align: 'center' }
    );
  doc
    .roundedRect(MARGIN + 160, doc.y - 16, 150, 16, 3)
    .fill(isAdvisory ? '#fef3c7' : record.isHealthy ? '#d1fae5' : '#fee2e2');
  doc
    .fillColor(isAdvisory ? '#92400e' : record.isHealthy ? '#065f46' : '#991b1b')
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(
      isAdvisory ? 'Source: Expert Rules' : record.isHealthy ? 'Status: Healthy' : 'Status: Disease Detected',
      MARGIN + 160,
      doc.y + 4.5,
      { width: 150, align: 'center' }
    );
  doc.y += 8;
  doc.moveDown(0.5);

  // ------------------------------------------------------------------
  // Leaf image (small, on the right of the observation summary)
  // ------------------------------------------------------------------
  const decoded = decodeReportImage(record.imageUrl || '');
  if (decoded) {
    try {
      doc.image(decoded.buffer, { fit: [74, 74] });
      doc.x = MARGIN;
      doc.y += 76;
    } catch (err) {
      doc
        .fillColor(MUTED)
        .font('Helvetica-Oblique')
        .fontSize(8)
        .text(`[Leaf thumbnail unavailable: ${getErrorMessage(err)}]`);
      doc.moveDown(0.2);
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
      .fontSize(8.5)
      .text(record.shortExplanation, { lineGap: 1.5 });
  }
  doc.moveDown(0.5);

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
        .fontSize(8.5)
        .text(`Matched Symptoms (${record.symptomsMatched.length})`, { continued: false });
      record.symptomsMatched.slice(0, 8).forEach((item) => {
        doc
          .fillColor(DARK)
          .font('Helvetica')
          .fontSize(8)
          .text(`• ${item}`, { bulletIndent: 8, width: CONTENT_WIDTH - 30, lineGap: 1 });
      });
      doc.moveDown(0.3);
    }
    if (record.symptomsRuledOut && record.symptomsRuledOut.length) {
      doc
        .fillColor(MUTED)
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(`Ruled-out Conditions (${record.symptomsRuledOut.length})`, { continued: false });
      record.symptomsRuledOut.slice(0, 8).forEach((item) => {
        doc
          .fillColor(DARK)
          .font('Helvetica')
          .fontSize(8)
          .text(`• ${item}`, { bulletIndent: 8, width: CONTENT_WIDTH - 30, lineGap: 1 });
      });
    }
    doc.moveDown(0.5);
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
      .fontSize(8.5)
      .text('Organic / Biological', { continued: false });
    doc
      .fillColor(DARK)
      .font('Helvetica')
      .fontSize(8)
      .text(tp.organic || '—', { lineGap: 1.2 })
      .moveDown(0.2);
    doc
      .fillColor(DARK)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('Conventional', { continued: false });
    doc
      .fillColor(DARK)
      .font('Helvetica')
      .fontSize(8)
      .text(tp.conventional || '—', { lineGap: 1.2 });
    if (tp.dosage || tp.applicationTiming) {
      doc.moveDown(0.1);
      labelValue(doc, 'Dosage', tp.dosage || '');
      labelValue(doc, 'Application Window', tp.applicationTiming || '');
    }
    doc.moveDown(0.4);
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
        .fontSize(8.5)
        .text(`Step ${action.step || 0}: ${action.title || ''}`, { continued: true });
      doc
        .fillColor(MUTED)
        .font('Helvetica-Oblique')
        .fontSize(7.5)
        .text(`  ${action.timing || ''}`);
      doc
        .fillColor(DARK)
        .font('Helvetica')
        .fontSize(8)
        .text(action.description || '', { width: CONTENT_WIDTH - 30, lineGap: 1.2 })
        .moveDown(0.15);
    });
    doc.moveDown(0.4);
  }

  // ------------------------------------------------------------------
  // Precautions
  // ------------------------------------------------------------------
  if (record.precautions && record.precautions.length) {
    sectionTitle(doc, 'Field Precautions');
    record.precautions.slice(0, 8).forEach((item) => {
      doc
        .fillColor(DARK)
        .font('Helvetica')
        .fontSize(8)
        .text(`• ${item}`, { bulletIndent: 8, width: CONTENT_WIDTH - 30, lineGap: 1.2 });
    });
    doc.moveDown(0.5);
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
    doc.moveDown(0.4);
  }

  // ------------------------------------------------------------------
  // Footer / disclaimer
  // ------------------------------------------------------------------
  doc
    .fillColor(LIGHT)
    .moveTo(MARGIN, doc.y)
    .lineTo(doc.page.width - MARGIN, doc.y)
    .lineWidth(0.8)
    .stroke()
    .moveDown(0.4);
  doc
    .fillColor(MUTED)
    .font('Helvetica-Oblique')
    .fontSize(7)
    .text(
      'Disclaimer: This report combines computer-vision classification (where available) with validated agronomic guidance ' +
      'from the AgriSmart crop-knowledge base. Classifier confidence is a ranking signal, not verified certainty. ' +
      'For laboratory confirmation or severe outbreaks, consult your district Krishi Vigyan Kendra (KVK) or local extension officer.',
      { width: CONTENT_WIDTH, lineGap: 1.5 }
    )
    .moveDown(0.5);
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(7)
    .text(
      `Report ID: ${record.id || '—'}  •  Generated by AgriSmart AI  •  ${new Date().toLocaleString()}`
    );

  doc.end();
  await done;
  return Buffer.concat(chunks);
};

export default buildDiagnosisReportPdf;