import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as docx from 'docx';
import * as xlsxModule from 'xlsx';
import pptxgen from 'pptxgenjs';

const xlsx = xlsxModule.default || xlsxModule;

/**
 * Clean string for safe filesystem usage
 */
function sanitizeFilename(str = 'document') {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').substring(0, 40);
}

/**
 * Multi-lingual Prompt Analyzer for Document Creation
 */
export function analyzeDocPrompt(message = '') {
  const lower = message.toLowerCase().trim();

  // 1. Detect target format
  let format = 'pdf'; // default
  if (
    lower.includes('ppt') ||
    lower.includes('pptx') ||
    lower.includes('powerpoint') ||
    lower.includes('presentation') ||
    lower.includes('slide') ||
    lower.includes('slides') ||
    lower.includes('ஸ்லைடு')
  ) {
    format = 'pptx';
  } else if (
    lower.includes('word') ||
    lower.includes('docx') ||
    lower.includes('doc') ||
    lower.includes('வேர்ட்') ||
    lower.includes('document')
  ) {
    format = 'docx';
  } else if (
    lower.includes('excel') ||
    lower.includes('xlsx') ||
    lower.includes('xls') ||
    lower.includes('spreadsheet') ||
    lower.includes('sheet') ||
    lower.includes('எக்செல்') ||
    lower.includes('table') ||
    lower.includes('budget') ||
    lower.includes('payroll') ||
    lower.includes('marklist') ||
    lower.includes('inventory')
  ) {
    format = 'xlsx';
  } else if (
    lower.includes('pdf') ||
    lower.includes('பிடிஎஃப்')
  ) {
    format = 'pdf';
  }

  // 2. Detect Document Category / Template
  let category = 'report';
  if (lower.includes('presentation') || lower.includes('slide') || lower.includes('slides') || lower.includes('ppt') || lower.includes('pptx') || lower.includes('deck')) {
    category = 'presentation';
    format = 'pptx';
  } else if (lower.includes('resume') || lower.includes('cv') || lower.includes('biodata') || lower.includes('ரெஸ்யூம்')) {
    category = 'resume';
    if (!lower.includes('docx') && !lower.includes('word')) {
      format = 'pdf';
    }
  } else if (lower.includes('invoice') || lower.includes('bill') || lower.includes('ரசீது')) {
    category = 'invoice';
    if (!lower.includes('xlsx') && !lower.includes('excel')) {
      format = 'pdf';
    }
  } else if (lower.includes('budget') || lower.includes('expense') || lower.includes('finance') || lower.includes('வரவு செலவு')) {
    category = 'budget';
    format = 'xlsx';
  } else if (lower.includes('payroll') || lower.includes('salary') || lower.includes('attendance') || lower.includes('சம்பளம்')) {
    category = 'payroll';
    format = 'xlsx';
  } else if (lower.includes('letter') || lower.includes('application') || lower.includes('விண்ணப்பம்') || lower.includes('கடிதம்')) {
    category = 'letter';
    if (!lower.includes('docx')) format = 'docx';
  } else if (lower.includes('marklist') || lower.includes('grade') || lower.includes('student') || lower.includes('மதிப்பெண்')) {
    category = 'marklist';
    format = 'xlsx';
  }

  // 3. Detect Slide Count
  let slideCount = 5;
  const slideMatch = message.match(/(\d+)\s*slide/i);
  if (slideMatch) {
    slideCount = Math.min(Math.max(parseInt(slideMatch[1], 10), 3), 30);
  } else if (lower.includes('12')) {
    slideCount = 12;
  }

  // 4. Detect Theme & Visual Palette (Dark, Light, Corporate Navy, Emerald)
  let theme = 'dark'; // Premium default or detect from user intent
  if (
    lower.includes('light') ||
    lower.includes('white') ||
    lower.includes('clean') ||
    lower.includes('minimal') ||
    lower.includes('வெள்ளை')
  ) {
    theme = 'light';
  } else if (
    lower.includes('navy') ||
    lower.includes('corporate') ||
    lower.includes('blue') ||
    lower.includes('business') ||
    lower.includes('executive') ||
    lower.includes('நீலம்')
  ) {
    theme = 'navy';
  } else if (
    lower.includes('emerald') ||
    lower.includes('green') ||
    lower.includes('fintech') ||
    lower.includes('பச்சை')
  ) {
    theme = 'emerald';
  } else if (
    lower.includes('dark') ||
    lower.includes('black') ||
    lower.includes('cyber') ||
    lower.includes('obsidian') ||
    lower.includes('night') ||
    lower.includes('கருப்பு') ||
    lower.includes('டார்க்')
  ) {
    theme = 'dark';
  } else {
    // If not specified, default to dark for high-end modern presentation look
    theme = 'dark';
  }
  const isLightTheme = theme === 'light' || theme === 'emerald';

  // 5. Extract Topic Title safely capped to max 50 chars
  let topic = 'Professional Presentation';
  const cleanMessage = message
    .replace(/\b(create|ready|generate|make|write|prepare|panni tha|ready pannu|kudu|thanga|podu|eluthi tha|in|format|file|document|sheet|pdf|word|excel|ppt|pptx|docx|xlsx|la|-la|pathi|oru|slides|slide|theme|light|dark|with|for|this)\b/gi, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const isMediaVaultContext = lower.includes('mediavault') || lower.includes('pwa') || lower.includes('progressive web app') || lower.includes('digital asset');

  if (isMediaVaultContext) {
    topic = 'MediaVault PWA & Creative Studio';
  } else if (cleanMessage.length > 2) {
    const words = cleanMessage.split(/\s+/).slice(0, 6);
    topic = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    if (topic.length > 50) topic = topic.substring(0, 50).trim();
  } else {
    if (category === 'presentation') topic = 'MediaVault PWA & Creative Studio';
    else if (category === 'resume') topic = 'Full Stack Software Engineer';
    else if (category === 'budget') topic = 'Monthly Budget & Expense Tracker';
    else if (category === 'invoice') topic = 'Freelance Professional Services';
    else if (category === 'payroll') topic = 'Company Payroll & Attendance';
    else topic = 'Comprehensive Project Report';
  }

  return { format, category, topic, slideCount, theme, isLightTheme };
}

/**
 * Check if a text message is asking to generate a document
 */
export function isDocCreationRequest(message = '') {
  const lower = message.toLowerCase().trim();
  const creationTriggers = [
    'create', 'ready', 'generate', 'write', 'make', 'prepare', 'draft',
    'panni tha', 'ready pannu', 'kudu', 'eluthi tha', 'senju tha', 'panni kudu',
    'உருவாக்கு', 'தயார் செய்', 'எழுதி தா'
  ];

  const docKeywords = [
    'pdf', 'word', 'doc', 'docx', 'excel', 'sheet', 'xlsx', 'ppt', 'pptx',
    'presentation', 'slide', 'slides', 'resume', 'cv', 'report', 'invoice',
    'bill', 'budget', 'table', 'letter', 'certificate', 'notes', 'document'
  ];

  const hasTrigger = creationTriggers.some(t => lower.includes(t));
  const hasDoc = docKeywords.some(d => lower.includes(d));

  return (hasTrigger && hasDoc) || (lower.startsWith('resume') || lower.startsWith('create ') || lower.startsWith('generate '));
}

// =========================================================================
// 1. PDF DOCUMENT GENERATOR
// =========================================================================
async function buildPdf(outputPath, options = {}) {
  const { category, topic, user = {}, slideCount = 12, isLightTheme = true, prompt = '' } = options;
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const primaryColor = rgb(0.48, 0.23, 0.93); // Purple #7c3aed
  const textColor = rgb(0.12, 0.16, 0.23); // #1f2937
  const mutedColor = rgb(0.42, 0.46, 0.54); // #6b7280

  if (category === 'resume') {
    // ---------------------------------------------------------------------
    // PROFESSIONAL RESUME TEMPLATE
    // ---------------------------------------------------------------------
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    let y = height - 50;

    // Header Accent Bar
    page.drawRectangle({
      x: 0,
      y: height - 12,
      width,
      height: 12,
      color: primaryColor
    });

    // Candidate Name
    const name = user.fullName || 'ALEX VANCE';
    page.drawText(name.toUpperCase(), {
      x: 45,
      y,
      size: 24,
      font: fontBold,
      color: primaryColor
    });
    y -= 22;

    // Subtitle / Job Title
    page.drawText(topic.toUpperCase(), {
      x: 45,
      y,
      size: 13,
      font: fontBold,
      color: textColor
    });
    y -= 16;

    // Contact Information Line
    const contactLine = `${user.email || 'alex.vance@mediavault.io'}  |  +91 98765 43210  |  Chennai, India  |  linkedin.com/in/profile  |  github.com/developer`;
    page.drawText(contactLine, {
      x: 45,
      y,
      size: 8.5,
      font: fontRegular,
      color: mutedColor
    });
    y -= 12;

    // Divider Line
    page.drawLine({
      start: { x: 45, y },
      end: { x: width - 45, y },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.93)
    });
    y -= 22;

    // Helper: Section Header
    const drawSectionHeader = (title) => {
      page.drawText(title.toUpperCase(), {
        x: 45,
        y,
        size: 11,
        font: fontBold,
        color: primaryColor
      });
      page.drawLine({
        start: { x: 45, y: y - 4 },
        end: { x: width - 45, y: y - 4 },
        thickness: 0.75,
        color: rgb(0.78, 0.82, 0.9)
      });
      y -= 18;
    };

    // 1. Professional Summary
    drawSectionHeader('Professional Summary');
    const summaryText = `High-impact ${topic} with demonstrated success in designing, scaling, and shipping production-grade distributed architectures, full-stack applications, and resilient digital asset pipelines. Proven track record of enhancing system reliability, optimizing cloud infrastructure costs, and collaborating with cross-functional engineering teams.`;
    
    // Word wrapping
    const words = summaryText.split(' ');
    let line = '';
    for (const w of words) {
      if ((line + w).length > 95) {
        page.drawText(line, { x: 45, y, size: 9, font: fontRegular, color: textColor });
        y -= 13;
        line = w + ' ';
      } else {
        line += w + ' ';
      }
    }
    if (line) {
      page.drawText(line, { x: 45, y, size: 9, font: fontRegular, color: textColor });
      y -= 18;
    }

    // 2. Technical Skills
    drawSectionHeader('Technical Skills & Core Competencies');
    const skills = [
      ['Frontend Architecture', 'React.js, Next.js, Vite, Tailwind CSS, TypeScript, Redux Toolkit, Konva'],
      ['Backend & APIs', 'Node.js, Express.js, RESTful Microservices, GraphQL, WebSocket, Python'],
      ['Databases & Storage', 'PostgreSQL, PGlite, MongoDB, Redis Caching, File Storage Systems'],
      ['DevOps & Cloud', 'Docker, Kubernetes, AWS (S3, EC2), CI/CD GitHub Actions, Linux administration'],
      ['Media & Document Engines', 'Sharp, PDF-lib, FFmpeg, SheetJS, Mammoth, LibreOffice Automation']
    ];

    for (const [categoryName, skillItems] of skills) {
      page.drawText(`•  ${categoryName}: `, { x: 45, y, size: 8.5, font: fontBold, color: textColor });
      page.drawText(skillItems, { x: 195, y, size: 8.5, font: fontRegular, color: mutedColor });
      y -= 14;
    }
    y -= 10;

    // 3. Work Experience
    drawSectionHeader('Professional Work Experience');
    const experiences = [
      {
        role: `Senior ${topic}`,
        company: 'MediaVault Technologies Inc. — Chennai, India',
        duration: '2023 – Present',
        bullets: [
          'Architected high-throughput universal file processing engine handling 10,000+ daily asset transformations.',
          'Reduced document conversion latency by 45% utilizing headless multi-threaded worker pools.',
          'Spearheaded transition to offline-first Progressive Web App (PWA) with client-side canvas fallback.'
        ]
      },
      {
        role: 'Full Stack Software Engineer',
        company: 'CopterCode Solutions — IIT Madras Research Park',
        duration: '2021 – 2023',
        bullets: [
          'Engineered institutional ERP microservices serving 15,000+ active faculty and student sessions.',
          'Implemented end-to-end automated testing pipelines reducing regression defect escape rate by 60%.'
        ]
      }
    ];

    for (const exp of experiences) {
      page.drawText(exp.role, { x: 45, y, size: 10, font: fontBold, color: textColor });
      page.drawText(exp.duration, { x: width - 120, y, size: 8.5, font: fontBold, color: primaryColor });
      y -= 13;
      page.drawText(exp.company, { x: 45, y, size: 8.5, font: fontOblique, color: mutedColor });
      y -= 13;
      for (const b of exp.bullets) {
        page.drawText(`-  ${b}`, { x: 55, y, size: 8.5, font: fontRegular, color: textColor });
        y -= 13;
      }
      y -= 6;
    }

    // 4. Education & Certifications
    drawSectionHeader('Education & Credentials');
    page.drawText('Bachelor of Engineering (B.E.) — Computer Science & Engineering', { x: 45, y, size: 9, font: fontBold, color: textColor });
    page.drawText('2020 – 2024', { x: width - 120, y, size: 8.5, font: fontRegular, color: mutedColor });
    y -= 13;
    page.drawText('Anna University Affiliated Engineering College  |  First Class with Distinction (CGPA: 8.8 / 10)', { x: 45, y, size: 8.5, font: fontRegular, color: mutedColor });
    y -= 16;
    page.drawText('• Certified AWS Cloud Solutions Architect  |  • Full Stack Software Engineering Professional (Meta)', { x: 45, y, size: 8.5, font: fontRegular, color: textColor });

    // Footer
    page.drawText('Generated by MediaVault AI Copilot — Verified & Formatted Document', {
      x: 140,
      y: 20,
      size: 7.5,
      font: fontOblique,
      color: mutedColor
    });

  } else if (category === 'presentation') {
    // ---------------------------------------------------------------------
    // 16:9 LANDSCAPE PRESENTATION SLIDE DECK (MULTI-THEME SUPPORT)
    // ---------------------------------------------------------------------
    const isMediaVault = (topic + ' ' + (options.prompt || '')).toLowerCase().includes('mediavault') || (topic + ' ' + (options.prompt || '')).toLowerCase().includes('pwa') || (options.prompt || '').toLowerCase().includes('progressive web app');
    const slides = getPresentationSlides(topic, options.slideCount || 12, isMediaVault);
    const isDark = (options.theme === 'dark' || options.theme === 'navy');

    const pdfBg = isDark ? rgb(0.04, 0.06, 0.1) : rgb(1, 1, 1);
    const pdfCardBg = isDark ? rgb(0.12, 0.16, 0.23) : rgb(0.97, 0.98, 1.0);
    const pdfCardBorder = isDark ? rgb(0.2, 0.25, 0.35) : rgb(0.9, 0.92, 0.97);
    const pdfTitleColor = isDark ? rgb(1, 1, 1) : rgb(0.12, 0.16, 0.23);
    const pdfTextColor = isDark ? rgb(0.9, 0.92, 0.97) : rgb(0.2, 0.24, 0.32);
    const pdfMutedColor = isDark ? rgb(0.6, 0.65, 0.75) : rgb(0.42, 0.46, 0.54);
    const pdfAccentBar = isDark ? rgb(0.55, 0.36, 0.96) : primaryColor;
    const pdfBadgeBg = isDark ? rgb(0.18, 0.08, 0.4) : rgb(0.95, 0.93, 1.0);
    const pdfBadgeText = isDark ? rgb(0.77, 0.71, 0.99) : primaryColor;

    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      const page = pdfDoc.addPage([841.89, 473.56]); // 16:9 Landscape
      const { width, height } = page.getSize();

      // Background fill
      page.drawRectangle({ x: 0, y: 0, width, height, color: pdfBg });

      // Top color bar
      page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: pdfAccentBar });

      // Slide tag badge
      page.drawRectangle({ x: 50, y: height - 55, width: 230, height: 22, color: pdfBadgeBg });
      page.drawText(s.tag, { x: 58, y: height - 48, size: 8.5, font: fontBold, color: pdfBadgeText });

      // Title
      page.drawText(s.title, { x: 50, y: height - 90, size: 20, font: fontBold, color: pdfTitleColor });
      // Subtitle
      page.drawText(s.subtitle, { x: 50, y: height - 110, size: 10.5, font: fontRegular, color: pdfMutedColor });

      // Divider
      page.drawLine({
        start: { x: 50, y: height - 125 },
        end: { x: width - 50, y: height - 125 },
        thickness: 1,
        color: isDark ? rgb(0.18, 0.22, 0.3) : rgb(0.9, 0.92, 0.96)
      });

      // Extract bullet items from template
      let displayItems = [];
      if (s.layoutType === 'cover') {
        displayItems = s.badges ? s.badges.map(b => `Core Pillar: ${b}`) : ['PWA Offline Architecture', 'In-Memory PDF Suite', 'AI Copilot Assistant'];
      } else if (s.layoutType === 'split' && s.leftCol && s.rightCol) {
        displayItems = [
          ...s.leftCol.items.slice(0, 2).map(it => `[Problem] ${it}`),
          ...s.rightCol.items.slice(0, 2).map(it => `[Solution] ${it}`)
        ];
      } else if (s.cards) {
        displayItems = s.cards.slice(0, 3).map(c => `${c.title || c.tag}: ${c.desc || (c.bullets ? c.bullets[0] : '')}`);
      } else if (s.metrics) {
        displayItems = s.metrics.map(m => `${m.value} - ${m.label} (${m.note})`);
      } else if (s.steps) {
        displayItems = s.steps.map(st => `Step ${st.step} [${st.title}]: ${st.desc}`);
      } else if (s.phases) {
        displayItems = s.phases.map(ph => `${ph.phase} [${ph.status}]: ${ph.bullets[0]}`);
      } else if (s.items) {
        displayItems = s.items.map(it => `${it.title}: ${it.desc}`);
      } else if (Array.isArray(s.body)) {
        displayItems = s.body;
      } else {
        displayItems = ['High-performance digital asset pipeline', 'Offline edge execution with zero loss', 'Enterprise cryptographic audit trails'];
      }

      // Slide content cards
      let cardY = height - 165;
      for (const item of displayItems.slice(0, 4)) {
        page.drawRectangle({
          x: 50,
          y: cardY - 10,
          width: width - 100,
          height: 38,
          color: pdfCardBg,
          borderColor: pdfCardBorder,
          borderWidth: 1
        });
        page.drawText(`-  ${item.substring(0, 110)}`, { x: 65, y: cardY + 8, size: 9.5, font: fontRegular, color: pdfTextColor });
        cardY -= 50;
      }

      // Slide number
      page.drawText(`Slide ${i + 1} of ${slides.length}  |  MediaVault AI Studio — ${isDark ? 'Obsidian Dark' : 'Silicon Valley Light'}`, {
        x: width - 300,
        y: 20,
        size: 8,
        font: fontRegular,
        color: pdfMutedColor
      });
    }

  } else {
    // ---------------------------------------------------------------------
    // PROFESSIONAL REPORT / PROPOSAL TEMPLATE
    // ---------------------------------------------------------------------
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    let y = height - 50;

    // Header banner
    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.96, 0.95, 1.0) });
    page.drawText(topic.toUpperCase(), { x: 45, y: height - 45, size: 18, font: fontBold, color: primaryColor });
    page.drawText(`Comprehensive Analysis & Technical Specification Report  |  ${new Date().toLocaleDateString()}`, {
      x: 45,
      y: height - 65,
      size: 9,
      font: fontRegular,
      color: mutedColor
    });

    y = height - 110;

    const sections = [
      {
        title: '1. Executive Summary',
        content: `This technical document provides an exhaustive overview of ${topic}. It synthesizes industry benchmarks, foundational design patterns, and empirical performance metrics. The objective is to establish a rigorous, scalable, and production-ready implementation standard.`
      },
      {
        title: '2. Problem Statement & Scope',
        content: `In modern engineering ecosystems, legacy architectures suffer from high latency, rigid formatting lock-ins, and fragile dependencies. This project addresses these bottlenecks by implementing modular, decoupled components that deliver end-to-end reliability.`
      },
      {
        title: '3. Technical Architecture & Methodology',
        content: `The system utilizes an asynchronous pipeline coupled with in-memory caching and client-side web API fallbacks. This hybrid cloud-and-edge design guarantees zero data loss and uninterrupted availability even under complete offline network conditions.`
      },
      {
        title: '4. Key Performance Indicators & Results',
        content: `Rigorous benchmark evaluations demonstrate a 40% reduction in processing latency and 99.9% uptime. Furthermore, automated unit and integration tests validate complete data fidelity across all operations.`
      },
      {
        title: '5. Recommendations & Next Steps',
        content: `1. Proceed with deployment to production staging environment.\n2. Enable real-time telemetry monitoring and alerting.\n3. Roll out AI Copilot autonomous assistance to all end-users.`
      }
    ];

    for (const sec of sections) {
      page.drawText(sec.title, { x: 45, y, size: 12, font: fontBold, color: primaryColor });
      y -= 16;

      const lines = sec.content.split('\n');
      for (const rawLine of lines) {
        const words = rawLine.split(' ');
        let curLine = '';
        for (const w of words) {
          if ((curLine + w).length > 92) {
            page.drawText(curLine, { x: 45, y, size: 9, font: fontRegular, color: textColor });
            y -= 13;
            curLine = w + ' ';
          } else {
            curLine += w + ' ';
          }
        }
        if (curLine) {
          page.drawText(curLine, { x: 45, y, size: 9, font: fontRegular, color: textColor });
          y -= 14;
        }
      }
      y -= 12;
    }

    // Footer
    page.drawText('MediaVault AI Copilot — Official Generated Document', {
      x: 45,
      y: 25,
      size: 8,
      font: fontOblique,
      color: mutedColor
    });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  return { pageCount: pdfDoc.getPageCount(), fileSize: pdfBytes.length };
}

// =========================================================================
// 2. WORD (DOCX) DOCUMENT GENERATOR
// =========================================================================
async function buildDocx(outputPath, { category, topic, user = {} }) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } = docx;

  const doc = new Document({
    title: topic,
    description: `Generated by MediaVault AI Copilot`,
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: topic.toUpperCase(),
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 }
          }),

          // Subtitle
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Official Document Prepared by MediaVault AI Copilot  •  ${new Date().toLocaleDateString()}`,
                italics: true,
                color: '666666',
                size: 20
              })
            ],
            spacing: { after: 300 }
          }),

          // Section 1: Executive Summary
          new Paragraph({
            text: '1. Executive Summary',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `This document presents an authoritative, structured report on ${topic}. The purpose of this dossier is to synthesize critical findings, outline strategic methodology, and detail execution steps. All recommendations are engineered for maximum reliability, cross-platform compatibility, and operational excellence.`,
                size: 22
              })
            ],
            spacing: { after: 200 }
          }),

          // Section 2: Objectives & Scope
          new Paragraph({
            text: '2. Project Objectives & Scope',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '•  Primary Goal: ', bold: true }),
              new TextRun({ text: `Establish end-to-end framework and operational standard for ${topic}.` })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '•  Performance Target: ', bold: true }),
              new TextRun({ text: 'Ensure sub-second processing latency and 100% offline fallback readiness.' })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '•  Security & Integrity: ', bold: true }),
              new TextRun({ text: 'Zero unauthenticated data access, rigorous audit trails, and automated backups.' })
            ],
            spacing: { after: 200 }
          }),

          // Section 3: Summary Table
          new Paragraph({
            text: '3. Strategic Milestones & Deliverables',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 }
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Milestone', bold: true, color: 'FFFFFF' })] })], shading: { fill: '7C3AED' } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Deliverable', bold: true, color: 'FFFFFF' })] })], shading: { fill: '7C3AED' } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Target Timeline', bold: true, color: 'FFFFFF' })] })], shading: { fill: '7C3AED' } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true, color: 'FFFFFF' })] })], shading: { fill: '7C3AED' } })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Phase 1: Ingestion')] }),
                  new TableCell({ children: [new Paragraph('Multi-modal file upload and validation')] }),
                  new TableCell({ children: [new Paragraph('Week 1 – 2')] }),
                  new TableCell({ children: [new Paragraph('Completed')] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Phase 2: Processing')] }),
                  new TableCell({ children: [new Paragraph('Universal conversion engine & AI Studio')] }),
                  new TableCell({ children: [new Paragraph('Week 3 – 4')] }),
                  new TableCell({ children: [new Paragraph('Active')] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Phase 3: Deployment')] }),
                  new TableCell({ children: [new Paragraph('PWA Offline mode & AI Copilot integration')] }),
                  new TableCell({ children: [new Paragraph('Week 5')] }),
                  new TableCell({ children: [new Paragraph('Ready')] })
                ]
              })
            ]
          }),

          // Section 4: Conclusion
          new Paragraph({
            text: '4. Conclusion & Next Steps',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `In summary, ${topic} is primed for production rollout. The architecture supports elastic scaling, seamless user interaction, and complete document workflow management.`,
                size: 22
              })
            ],
            spacing: { after: 200 }
          })
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  return { fileSize: buffer.length };
}

// =========================================================================
// 3. EXCEL (XLSX) SPREADSHEET GENERATOR
// =========================================================================
async function buildXlsx(outputPath, { category, topic }) {
  const wb = xlsx.utils.book_new();

  if (category === 'budget') {
    // ---------------------------------------------------------------------
    // MONTHLY BUDGET & EXPENSE TRACKER SPREADSHEET
    // ---------------------------------------------------------------------
    const budgetData = [
      ['Date', 'Category', 'Description', 'Income ($)', 'Expense ($)', 'Net Balance ($)', 'Payment Mode', 'Notes'],
      ['2026-11-01', 'Salary', 'Primary Software Engineering Salary', 6500, 0, 6500, 'Direct Deposit', 'Monthly Base'],
      ['2026-11-02', 'Freelance', 'Full Stack Consulting Project', 1200, 0, 7700, 'Bank Transfer', 'Milestone 1'],
      ['2026-11-03', 'Housing', 'Apartment Rent & Maintenance', 0, 1800, 5900, 'Online Banking', 'Fixed Expense'],
      ['2026-11-05', 'Groceries', 'Supermarket Supplies & Essentials', 0, 320, 5580, 'Debit Card', 'Bi-weekly stock'],
      ['2026-11-08', 'Utilities', 'High-Speed Fiber Internet & Electric', 0, 140, 5440, 'Auto Debit', 'Monthly bills'],
      ['2026-11-12', 'Investments', 'Index Funds & Mutual Fund SIP', 0, 1500, 3940, 'SIP Auto-Invest', 'Wealth Building'],
      ['2026-11-15', 'Transport', 'Fuel & Commute Passes', 0, 95, 3845, 'Credit Card', 'Local travel'],
      ['2026-11-20', 'Dining & Leisure', 'Weekend Dinners & Movies', 0, 180, 3665, 'Credit Card', 'Discretionary'],
      ['2026-11-25', 'Health & Fitness', 'Gym Membership & Supplements', 0, 110, 3555, 'Credit Card', 'Wellness'],
      ['TOTALS', '', 'Monthly Financial Summary', 7700, 4145, 3555, '', 'Net Savings: 46.2%']
    ];

    const ws = xlsx.utils.aoa_to_sheet(budgetData);
    ws['!cols'] = [
      { wch: 12 }, { wch: 16 }, { wch: 36 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 22 }
    ];
    xlsx.utils.book_append_sheet(wb, ws, 'Budget Tracker');

    // Sheet 2: Category Summary
    const catData = [
      ['Category', 'Budget Allocated ($)', 'Actual Spent ($)', 'Variance ($)', 'Percentage of Budget'],
      ['Housing (Rent)', 1800, 1800, 0, '100%'],
      ['Investments', 1500, 1500, 0, '100%'],
      ['Groceries', 400, 320, 80, '80%'],
      ['Utilities', 150, 140, 10, '93.3%'],
      ['Dining & Leisure', 250, 180, 70, '72%'],
      ['Transport', 120, 95, 25, '79.1%'],
      ['Health & Fitness', 120, 110, 10, '91.7%'],
      ['TOTAL EXPENSES', 4340, 4145, 195, '95.5%']
    ];
    const ws2 = xlsx.utils.aoa_to_sheet(catData);
    ws2['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 22 }];
    xlsx.utils.book_append_sheet(wb, ws2, 'Category Summary');

  } else if (category === 'payroll') {
    // ---------------------------------------------------------------------
    // EMPLOYEE PAYROLL & ATTENDANCE SPREADSHEET
    // ---------------------------------------------------------------------
    const payrollData = [
      ['Emp ID', 'Full Name', 'Department', 'Role', 'Base Salary ($)', 'HRA ($)', 'Performance Bonus ($)', 'Deductions (Tax) ($)', 'Net Pay ($)', 'Days Present', 'Status'],
      ['EMP-101', 'Alex Vance', 'Engineering', 'Lead Full Stack Architect', 9500, 2000, 1200, 1850, 10850, 22, 'Paid'],
      ['EMP-102', 'Sarah Connor', 'Product Design', 'Senior UX/UI Lead', 7800, 1600, 800, 1450, 8750, 21, 'Paid'],
      ['EMP-103', 'John Doe', 'Engineering', 'Cloud DevOps Engineer', 8200, 1700, 950, 1550, 9300, 22, 'Paid'],
      ['EMP-104', 'Emily Watson', 'Data Science', 'AI Machine Learning Specialist', 9000, 1900, 1100, 1720, 10280, 20, 'Paid'],
      ['EMP-105', 'Michael Chang', 'Quality Assurance', 'Automation Test Lead', 6500, 1300, 500, 1150, 7150, 22, 'Paid'],
      ['EMP-106', 'Priya Sharma', 'Marketing', 'Growth Marketing Strategist', 6200, 1250, 600, 1080, 6970, 21, 'Paid'],
      ['TOTALS', '6 Active Employees', 'Organization Wide', '', 47200, 9750, 5150, 8800, 53300, 128, 'Verified']
    ];

    const ws = xlsx.utils.aoa_to_sheet(payrollData);
    ws['!cols'] = [
      { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 28 }, { wch: 15 }, { wch: 12 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 10 }
    ];
    xlsx.utils.book_append_sheet(wb, ws, 'Employee Payroll');

  } else {
    // ---------------------------------------------------------------------
    // GENERAL METRICS / SALES REPORT SPREADSHEET
    // ---------------------------------------------------------------------
    const generalData = [
      ['ID', 'Quarter', 'Product / Service Stream', 'Region', 'Units Sold', 'Unit Price ($)', 'Gross Revenue ($)', 'Target Revenue ($)', 'Achievement %', 'Status'],
      ['STR-01', 'Q1 2026', `${topic} — Enterprise Edition`, 'North America', 120, 950, 114000, 100000, '114%', 'Exceeded'],
      ['STR-02', 'Q1 2026', `${topic} — Professional Tier`, 'Europe (EMEA)', 250, 450, 112500, 110000, '102%', 'Achieved'],
      ['STR-03', 'Q1 2026', `${topic} — Developer Cloud API`, 'Asia Pacific', 580, 150, 87000, 75000, '116%', 'Exceeded'],
      ['STR-04', 'Q1 2026', `${topic} — Starter License`, 'Latin America', 310, 85, 26350, 30000, '88%', 'On Track'],
      ['STR-05', 'Q1 2026', `${topic} — Annual Support SLA`, 'Global Accounts', 45, 1200, 54000, 50000, '108%', 'Exceeded'],
      ['SUMMARY', 'Q1 2026', 'Total Performance Portfolio', 'Global', 1305, '', 393850, 365000, '107.9%', 'Outstanding']
    ];

    const ws = xlsx.utils.aoa_to_sheet(generalData);
    ws['!cols'] = [
      { wch: 10 }, { wch: 10 }, { wch: 36 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 14 }
    ];
    xlsx.utils.book_append_sheet(wb, ws, 'Financial Performance');
  }

  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(outputPath, buffer);
  return { fileSize: buffer.length };
}

// =========================================================================
// 4. PRESENTATION THEMES & PALETTES
// =========================================================================
export const PRESENTATION_THEMES = {
  dark: {
    name: 'Cyber Obsidian Dark',
    bg: '0B0F19',
    primary: '8B5CF6',
    secondary: '38BDF8',
    accent: '06B6D4',
    titleText: 'FFFFFF',
    bodyText: 'E2E8F0',
    mutedText: '94A3B8',
    cardBg: '1E293B',
    cardBorder: '334155',
    highlightCardBg: '1E1B4B',
    badgeBg: '2E1065',
    badgeText: 'C4B5FD',
    accentBar: '8B5CF6',
    divider: '1E293B'
  },
  light: {
    name: 'Silicon Valley Light',
    bg: 'FFFFFF',
    primary: '6D28D9',
    secondary: '0284C7',
    accent: '7C3AED',
    titleText: '0F172A',
    bodyText: '334155',
    mutedText: '64748B',
    cardBg: 'F8FAFC',
    cardBorder: 'E2E8F0',
    highlightCardBg: 'F5F3FF',
    badgeBg: 'EDE9FE',
    badgeText: '6D28D9',
    accentBar: '7C3AED',
    divider: 'E2E8F0'
  },
  navy: {
    name: 'Corporate Executive Navy',
    bg: '0A192F',
    primary: '38BDF8',
    secondary: 'F59E0B',
    accent: '60A5FA',
    titleText: 'F8FAFC',
    bodyText: 'CBD5E1',
    mutedText: '8892B0',
    cardBg: '112240',
    cardBorder: '233554',
    highlightCardBg: '172A45',
    badgeBg: '1E3A8A',
    badgeText: '93C5FD',
    accentBar: '38BDF8',
    divider: '233554'
  },
  emerald: {
    name: 'Fintech Emerald & Slate',
    bg: 'FAFAFA',
    primary: '059669',
    secondary: '0D9488',
    accent: '10B981',
    titleText: '0F172A',
    bodyText: '334155',
    mutedText: '64748B',
    cardBg: 'FFFFFF',
    cardBorder: 'E2E8F0',
    highlightCardBg: 'ECFDF5',
    badgeBg: 'D1FAE5',
    badgeText: '065F46',
    accentBar: '059669',
    divider: 'E2E8F0'
  }
};

// =========================================================================
// 5. PRESENTATION SLIDES BUILDER (12 SLIDES WITH DIVERSE TEMPLATES)
// =========================================================================
export function getPresentationSlides(topic = 'MediaVault Platform', slideCount = 12, isMediaVaultContext = true) {
  const full12Slides = [
    // Slide 1: Hero Cover Slide
    {
      layoutType: 'cover',
      tag: 'EXECUTIVE ARCHITECTURAL BRIEFING',
      title: 'MediaVault — Unified Digital Asset & Studio Platform',
      subtitle: 'Next-Generation Media Processing, In-Memory PDF Suite, Creative Design Canvas & Autonomous Multilingual AI Copilot',
      badges: [
        'Progressive Web App (PWA)',
        '100% Offline Edge Resilience',
        'Enterprise Cryptographic Vault'
      ],
      authorNotice: 'Prepared by MediaVault AI Studio • Confidential & Executive Specification'
    },
    // Slide 2: 2-Column Comparison Split Slide
    {
      layoutType: 'split',
      tag: '2. PROBLEM ANALYSIS & OPP',
      title: 'Creative Workflow Bottlenecks & Opportunities',
      subtitle: 'Overcoming Severe Tool Fragmentation, Latency & Data Exposure',
      leftCol: {
        header: 'LEGACY TOOL PAIN POINTS',
        badgeColor: 'amber',
        items: [
          'Fragmented Workflows: Creators juggle 5+ separate single-purpose tools for conversions, edits, and PDF cuts.',
          'Cloud Latency & Drops: Total workflow stoppage and file transfer failures during internet fluctuations.',
          'Security Exposure: Free ad-driven online converters risk leaking confidential corporate and personal media.'
        ]
      },
      rightCol: {
        header: 'THE MEDIAVAULT ADVANTAGE',
        badgeColor: 'purple',
        items: [
          'Single Unified Hub: Conversions, PDF tools, photo studio, canvas design & AI in one unified app.',
          'Sub-Second Edge Engine: In-browser web workers and in-memory streams eliminate processing latency.',
          'Offline-First Privacy: 100% client-side fallbacks guarantee local confidentiality without third-party leaks.'
        ]
      }
    },
    // Slide 3: 3 Tall Vertical Pillar Cards
    {
      layoutType: 'grid3',
      tag: '3. STRATEGIC PILLARS',
      title: 'Core Architectural Pillars',
      subtitle: 'Engineered for Scalability, High Availability & Enterprise Autonomy',
      cards: [
        {
          num: '01',
          title: 'Unified Media Vault',
          bullets: [
            'Centralized multi-modal asset hub with instant search & folders.',
            'Cryptographic SHA-256 bit-for-bit file integrity validation.',
            'Perceptual hashing (pHash) for automated duplicate photo detection.'
          ]
        },
        {
          num: '02',
          title: 'Offline Edge Engine',
          bullets: [
            'PWA installable natively on Desktop & Mobile with zero setup.',
            'Service Worker pre-caching ensures 100% offline access.',
            'Local canvas transformations for instant sticker & image edits.'
          ]
        },
        {
          num: '03',
          title: 'Autonomous AI Copilot',
          bullets: [
            'Understands natural language in English, Tamil, and Tanglish.',
            'Generates complete Word, Excel, PDF, and PPT decks on demand.',
            'Direct conversational file editing (sticker creation, page cuts).'
          ]
        }
      ]
    },
    // Slide 4: 4 Quadrant Cards
    {
      layoutType: 'grid4',
      tag: '4. TECHNOLOGY STACK',
      title: 'Full-Stack Technical Foundation',
      subtitle: 'Enterprise Type-Safe, Reactive & Cloud-Edge Hybrid Architecture',
      cards: [
        {
          tag: 'FRONTEND ARCHITECTURE',
          title: 'React 18 & Vite Ecosystem',
          desc: 'Blazing-fast reactive UI, Tailwind CSS design system, Lucide icons, Konva vector canvas, and PWA service workers.'
        },
        {
          tag: 'BACKEND MICROSERVICES',
          title: 'Node.js & Express REST Engine',
          desc: 'Asynchronous streaming pipelines, Multer multipart streams, JWT auth, and modular controller services.'
        },
        {
          tag: 'DATA & STORAGE LAYER',
          title: 'PostgreSQL & Embedded PGlite',
          desc: 'ACID-compliant relational schema, embedded PGlite for self-contained execution, and structured version tracking.'
        },
        {
          tag: 'MEDIA ENGINES',
          title: 'Sharp, PDF-Lib & FFmpeg',
          desc: 'High-throughput image processing, in-memory PDF assembly/trimming, SheetJS spreadsheets, and video transcoding.'
        }
      ]
    },
    // Slide 5: Feature Cards with Category Tags
    {
      layoutType: 'cards',
      tag: '5. UNIVERSAL CONVERTER',
      title: '11-Studio Universal Transcoding Engine',
      subtitle: 'Zero-Loss In-Memory Conversion Across All Modern File Categories',
      cards: [
        {
          tag: 'VISUAL & IMAGE MEDIA',
          title: 'High-Fidelity Raster & Vector Conversions',
          desc: 'Lossless transformations across WebP, PNG, JPG, AVIF, TIFF, SVG, and animated GIF using Sharp engine.'
        },
        {
          tag: 'DOCUMENT WORKFLOWS',
          title: 'Document Interchange & Preservation',
          desc: 'Bidirectional conversions between PDF, Word DOCX, Excel XLSX, TXT, and Markdown with formatting fidelity.'
        },
        {
          tag: 'AUDIO & VIDEO STREAMING',
          title: 'FFmpeg Streaming Transcoding',
          desc: 'Multi-threaded audio/video conversions (MP4, MP3, WAV, MKV, WebM) with custom bitrate, codec, and container controls.'
        }
      ]
    },
    // Slide 6: Professional PDF Suite List
    {
      layoutType: 'list',
      tag: '6. PDF TOOLS SUITE',
      title: 'In-Memory PDF Assembly & Trimming Suite',
      subtitle: 'Fast, Precise Document Manipulation Without Cloud Dependencies',
      items: [
        {
          title: 'Merge & Split In-Memory',
          desc: 'Concatenate multiple PDF documents into a single consolidated file or split large manuals by chapter in under 500ms.'
        },
        {
          title: 'Page Reordering & Orientation Control',
          desc: 'Rotate portrait/landscape orientations on individual pages and rearrange document sequence with instant browser preview.'
        },
        {
          title: 'Conversational Intelligent Trimming',
          desc: 'AI Copilot detects natural language instructions like "Remove last 2 certificates" and extracts clean finalized documents.'
        }
      ]
    },
    // Slide 7: Big KPI Metrics Dashboard
    {
      layoutType: 'metrics',
      tag: '7. PERFORMANCE BENCHMARKS',
      title: 'Empirical Outcomes & Reliability Metrics',
      subtitle: 'Quantifiable Engineering Metrics Demonstrating Platform Superiority',
      metrics: [
        { value: '99.98%', label: 'Processing Reliability', note: 'Zero defect rate across format conversions' },
        { value: '< 50ms', label: 'In-Browser Latency', note: 'Client canvas transforms without network lag' },
        { value: '100%', label: 'Offline Availability', note: 'Complete workflow continuity when offline' },
        { value: '65%', label: 'Compute Reduction', note: 'Edge caching minimizes server overhead' }
      ]
    },
    // Slide 8: Mission & Architectural Vision Quote
    {
      layoutType: 'quote',
      tag: '8. ARCHITECTURAL VISION',
      title: 'Autonomous Creative Media Production',
      subtitle: 'Bridging the Divide Between Desktop Autonomy and Cloud Power',
      quote: '"MediaVault redefines digital asset management by fusing cloud-grade power with 100% offline edge resilience and conversational intelligence."',
      author: 'MediaVault Architectural Blueprint • Future of Creative Systems',
      points: [
        'Democratizes advanced media editing without expensive licensing barriers.',
        'Eliminates vendor lock-in with open standard file formats and exportable vault records.',
        'Protects user autonomy through uncompromising offline-first architectural principles.'
      ]
    },
    // Slide 9: AI Copilot Quadrants
    {
      layoutType: 'grid4',
      tag: '9. AUTONOMOUS AI COPILOT',
      title: 'Conversational Multilingual AI Assistant',
      subtitle: 'Natural Language Document Generation & Contextual Media Editing',
      cards: [
        {
          tag: 'NATURAL LANGUAGE PROCESSING',
          title: 'Multilingual Communication',
          desc: 'Native support for English, Tamil, and colloquial Tanglish (e.g. "kudu", "panni tha", "தயார் செய்").'
        },
        {
          tag: 'DOCUMENT SYNTHESIS',
          title: 'On-Demand Generation',
          desc: 'Generates structured resumes, Word DOCX reports, Excel financial sheets, and 12-slide presentation decks.'
        },
        {
          tag: 'MEDIA ACTIONS',
          title: 'Direct File Editing',
          desc: 'Processes attached files instantly: background cutouts, transparent stickers, format changes, and page cuts.'
        },
        {
          tag: 'EDGE RESILIENCE',
          title: 'Client-Side Fallback',
          desc: 'Automatically switches to in-browser Canvas transformations if server network connectivity drops.'
        }
      ]
    },
    // Slide 10: Horizontal Flow Steps
    {
      layoutType: 'flow',
      tag: '10. PWA OFFLINE ENGINE',
      title: 'Offline-First Progressive Web App Pipeline',
      subtitle: 'Continuous Productivity Without an Active Internet Connection',
      steps: [
        { step: '01', title: 'Asset Caching', desc: 'Pre-caches UI shell, icons, and web workers locally.' },
        { step: '02', title: 'Edge Worker', desc: 'Service Worker intercepts fetch requests seamlessly.' },
        { step: '03', title: 'In-Browser Canvas', desc: 'Runs Sharp/Canvas image filters & stickers locally.' },
        { step: '04', title: 'Sync on Connect', desc: 'Queued file uploads sync automatically when online.' }
      ]
    },
    // Slide 11: Security & Governance Split
    {
      layoutType: 'split',
      tag: '11. SECURITY & GOVERNANCE',
      title: 'Cryptographic Verification & Asset Governance',
      subtitle: 'Ensuring Absolute Data Integrity, Auditability & Deduplication',
      leftCol: {
        header: 'CRYPTOGRAPHIC INTEGRITY',
        badgeColor: 'purple',
        items: [
          'SHA-256 Hashes: Every file receives an immutable cryptographic fingerprint on ingestion.',
          'Perceptual Hashing (pHash): Detects visually identical photos across resolutions and crops.',
          'Storage Optimization: Prevents duplicate uploads, saving up to 40% of disk storage.'
        ]
      },
      rightCol: {
        header: 'GOVERNANCE & VERSIONING',
        badgeColor: 'blue',
        items: [
          'Automated Versioning: Every file modification generates a discrete version with change summaries.',
          'Instant Rollback: Revert to any historical version with single-click precision.',
          'Granular Audit Trails: Comprehensive activity logging for compliance and governance.'
        ]
      }
    },
    // Slide 12: Deployment Roadmap Phases
    {
      layoutType: 'roadmap',
      tag: '12. STRATEGIC ROADMAP',
      title: 'Production Milestones & Next Horizons',
      subtitle: 'From High-Impact Single-Tenant Studio to Federated Enterprise Asset Mesh',
      phases: [
        {
          phase: 'Phase 1: Foundation',
          status: 'COMPLETED',
          bullets: [
            '11-Studio Universal Converter, PDF Suite & AI Photo Studio launched.',
            'PWA Offline Service Worker engine with in-browser canvas fallbacks.',
            'Autonomous Multilingual AI Copilot with dynamic document drafting.'
          ]
        },
        {
          phase: 'Phase 2: Cloud Scaling',
          status: 'ACTIVE / STAGING',
          bullets: [
            'Docker containerization with Kubernetes auto-scaling worker nodes.',
            'Distributed object storage backends (AWS S3, MinIO, Cloudflare R2).',
            'Enterprise Single Sign-On (SSO) and role-based multi-tenancy.'
          ]
        },
        {
          phase: 'Phase 3: Horizon',
          status: 'PLANNED',
          bullets: [
            'Real-time multi-user collaborative canvas editing via WebSockets.',
            'On-device WebAssembly (Wasm) LLM inference for 100% offline AI chats.',
            'AI automated video summarization and smart clip generation.'
          ]
        }
      ]
    }
  ];

  if (isMediaVaultContext || slideCount >= 10) {
    return full12Slides.slice(0, Math.min(slideCount, full12Slides.length));
  }

  // Generic fallback if not MediaVault context
  const genericSlides = [
    {
      layoutType: 'cover',
      tag: '1. EXECUTIVE OVERVIEW',
      title: topic,
      subtitle: 'Strategic Architecture, Foundations & Roadmap',
      badges: ['Enterprise Architecture', 'High Scalability', 'Production Ready'],
      authorNotice: 'Prepared by MediaVault AI Studio • Executive Briefing'
    },
    {
      layoutType: 'split',
      tag: '2. PROBLEM ANALYSIS',
      title: 'Core Challenges in Current Workflows',
      subtitle: 'Addressing Fragmentation and Performance Bottlenecks',
      leftCol: {
        header: 'CURRENT BOTTLENECKS',
        items: [
          'Legacy monolithic architectures create severe scaling and maintenance bottlenecks.',
          'Disjointed data pipelines lead to inconsistent user experiences and latency.',
          'High operational overhead due to repetitive manual interventions.'
        ]
      },
      rightCol: {
        header: 'STRATEGIC OPPORTUNITY',
        items: [
          'Modern decoupled architectures provide 3x agility and improved fault tolerance.',
          'Sub-second automated pipelines eliminate operational delays.',
          'Autonomous assistance streamlines user workflows end-to-end.'
        ]
      }
    },
    {
      layoutType: 'grid3',
      tag: '3. TECHNICAL METHODOLOGY',
      title: 'System Design & Implementation Pillars',
      subtitle: 'Scalable Microservices and Edge-First Design',
      cards: [
        { num: '01', title: 'Data Ingestion', bullets: ['Multi-tiered asynchronous processing engine with in-memory caching.', 'Real-time validation against data schema specifications.', 'Automated chunking for high-throughput concurrency.'] },
        { num: '02', title: 'Edge Compute', bullets: ['Resilient failover mechanisms guaranteeing service continuity.', 'Local browser execution reducing server bandwidth consumption.', 'Zero-latency visual and document transformations.'] },
        { num: '03', title: 'Governance', bullets: ['Automated CI/CD validation pipelines ensuring zero defect escape.', 'Continuous telemetry monitoring and predictive error detection.', 'Immutable audit logging for complete accountability.'] }
      ]
    },
    {
      layoutType: 'metrics',
      tag: '4. PERFORMANCE RESULTS',
      title: 'Metrics & Quantitative Benchmarks',
      subtitle: 'Empirical Outcomes and Reliability Statistics',
      metrics: [
        { value: '99.98%', label: 'Operational Uptime', note: 'Observed across test validation cycles' },
        { value: '< 100ms', label: 'Response Latency', note: 'Achieved via optimized database indexing' },
        { value: '65%', label: 'Compute Reduction', note: 'Utilizing client-side edge computing' },
        { value: '100%', label: 'Data Integrity', note: 'Zero data corruption observed in tests' }
      ]
    },
    {
      layoutType: 'roadmap',
      tag: '5. STRATEGIC ROADMAP',
      title: 'Action Plan & Next Milestones',
      subtitle: 'Deployment Timeline and Long-term Vision',
      phases: [
        { phase: 'Phase 1: Validation', status: 'COMPLETED', bullets: ['Architecture definition and baseline benchmark tests.', 'Prototype development and user journey validation.'] },
        { phase: 'Phase 2: Staging', status: 'ACTIVE', bullets: ['Staging deployment and automated load stress testing.', 'Integration of AI Copilot automated assistance workflows.'] },
        { phase: 'Phase 3: Rollout', status: 'PLANNED', bullets: ['Full enterprise rollout and user onboarding.', 'Continuous performance tuning and federated scaling.'] }
      ]
    }
  ];

  return genericSlides.slice(0, Math.min(slideCount, genericSlides.length));
}

// =========================================================================
// 6. POWERPOINT (PPTX) PRESENTATION GENERATOR (MULTI-THEME & MULTI-TEMPLATE)
// =========================================================================
async function buildPptx(outputPath, { category, topic, slideCount = 12, theme = 'dark', prompt = '', user = {} }) {
  const isMediaVaultContext = prompt.toLowerCase().includes('mediavault') || prompt.toLowerCase().includes('pwa') || prompt.toLowerCase().includes('progressive web app') || prompt.toLowerCase().includes('digital asset');
  const slides = getPresentationSlides(topic, slideCount, isMediaVaultContext);
  const t = PRESENTATION_THEMES[theme] || PRESENTATION_THEMES.dark;

  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.author = user.fullName || 'MediaVault AI Copilot';
  pres.company = 'MediaVault Technologies';
  pres.title = topic;

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const slide = pres.addSlide();
    slide.background = { color: t.bg };

    // Standard Footer
    const footerText = `Slide ${i + 1} of ${slides.length}  |  MediaVault AI Studio • ${t.name}`;
    slide.addText(footerText, {
      x: 0.8, y: 7.05, w: 11.7, h: 0.3,
      fontSize: 8.5, color: t.mutedText,
      align: 'right'
    });

    // -------------------------------------------------------------
    // TEMPLATE 1: HERO COVER SLIDE
    // -------------------------------------------------------------
    if (s.layoutType === 'cover') {
      // Left vertical pillar accent bar
      slide.addShape(pres.ShapeType.rect, {
        x: 0, y: 0, w: 0.35, h: '100%',
        fill: { color: t.primary },
        line: { color: t.primary }
      });

      // Top Tag Badge
      slide.addShape(pres.ShapeType.roundRect, {
        x: 1.0, y: 0.9, w: 3.6, h: 0.4,
        rectRadius: 0.08,
        fill: { color: t.badgeBg },
        line: { color: t.cardBorder, width: 1 }
      });
      slide.addText(s.tag, {
        x: 1.0, y: 0.9, w: 3.6, h: 0.4,
        fontSize: 10, bold: true, color: t.badgeText,
        align: 'center', valign: 'middle'
      });

      // Hero Title
      slide.addText(s.title, {
        x: 1.0, y: 1.5, w: 11.2, h: 1.5,
        fontSize: 30, bold: true, color: t.titleText,
        valign: 'middle'
      });

      // Hero Subtitle
      slide.addText(s.subtitle, {
        x: 1.0, y: 3.1, w: 11.2, h: 0.9,
        fontSize: 13, italic: true, color: t.mutedText,
        valign: 'top'
      });

      // 3 Highlight Pillar Cards
      const badges = s.badges || ['PWA Offline Engine', 'In-Memory PDF Suite', 'AI Copilot Assistant'];
      for (let bIdx = 0; bIdx < badges.length; bIdx++) {
        const bX = 1.0 + bIdx * 3.85;
        slide.addShape(pres.ShapeType.roundRect, {
          x: bX, y: 4.3, w: 3.65, h: 1.2,
          rectRadius: 0.08,
          fill: { color: t.cardBg },
          line: { color: t.cardBorder, width: 1 }
        });
        slide.addShape(pres.ShapeType.rect, {
          x: bX, y: 4.3, w: 0.12, h: 1.2,
          fill: { color: t.primary },
          line: { color: t.primary }
        });
        slide.addText(`PILLAR 0${bIdx + 1}`, {
          x: bX + 0.3, y: 4.45, w: 3.2, h: 0.3,
          fontSize: 9, bold: true, color: t.primary
        });
        slide.addText(badges[bIdx], {
          x: bX + 0.3, y: 4.75, w: 3.2, h: 0.6,
          fontSize: 12, bold: true, color: t.titleText
        });
      }

      // Author notice
      slide.addText(s.authorNotice || 'MediaVault Executive Presentation', {
        x: 1.0, y: 6.2, w: 11.2, h: 0.4,
        fontSize: 10, italic: true, color: t.mutedText
      });
      continue;
    }

    // -------------------------------------------------------------
    // COMMON HEADER FOR CONTENT SLIDES
    // -------------------------------------------------------------
    // Top accent bar
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 0.12,
      fill: { color: t.accentBar },
      line: { color: t.accentBar }
    });

    // Tag badge
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: 0.45, w: 2.9, h: 0.35,
      rectRadius: 0.08,
      fill: { color: t.badgeBg },
      line: { color: t.cardBorder, width: 1 }
    });
    slide.addText(s.tag, {
      x: 0.8, y: 0.45, w: 2.9, h: 0.35,
      fontSize: 9.5, bold: true, color: t.badgeText,
      align: 'center', valign: 'middle'
    });

    // Title
    slide.addText(s.title, {
      x: 0.8, y: 0.9, w: 11.7, h: 0.55,
      fontSize: 20, bold: true, color: t.titleText,
      valign: 'middle'
    });

    // Subtitle
    slide.addText(s.subtitle, {
      x: 0.8, y: 1.45, w: 11.7, h: 0.35,
      fontSize: 11, italic: true, color: t.mutedText,
      valign: 'middle'
    });

    // Divider line
    slide.addShape(pres.ShapeType.line, {
      x: 0.8, y: 1.9, w: 11.7, h: 0,
      line: { color: t.divider, width: 1.5 }
    });

    // -------------------------------------------------------------
    // TEMPLATE 2: 2-COLUMN SPLIT (COMPARISON / PROBLEM VS SOLUTION)
    // -------------------------------------------------------------
    if (s.layoutType === 'split' && s.leftCol && s.rightCol) {
      // Left Column Card
      slide.addShape(pres.ShapeType.roundRect, {
        x: 0.8, y: 2.15, w: 5.7, h: 4.65,
        rectRadius: 0.08,
        fill: { color: t.cardBg },
        line: { color: t.cardBorder, width: 1 }
      });
      slide.addShape(pres.ShapeType.roundRect, {
        x: 1.1, y: 2.4, w: 5.1, h: 0.45,
        rectRadius: 0.06,
        fill: { color: t.badgeBg },
        line: { color: t.cardBorder, width: 1 }
      });
      slide.addText(s.leftCol.header, {
        x: 1.1, y: 2.4, w: 5.1, h: 0.45,
        fontSize: 10.5, bold: true, color: t.badgeText,
        align: 'center', valign: 'middle'
      });
      let leftY = 3.05;
      for (const item of s.leftCol.items) {
        slide.addShape(pres.ShapeType.roundRect, {
          x: 1.1, y: leftY, w: 0.12, h: 0.3,
          rectRadius: 0.04, fill: { color: 'F59E0B' }, line: { color: 'F59E0B' }
        });
        slide.addText(item, {
          x: 1.35, y: leftY - 0.05, w: 4.85, h: 1.05,
          fontSize: 11, color: t.bodyText, valign: 'top'
        });
        leftY += 1.15;
      }

      // Right Column Card (Highlighted)
      slide.addShape(pres.ShapeType.roundRect, {
        x: 6.8, y: 2.15, w: 5.7, h: 4.65,
        rectRadius: 0.08,
        fill: { color: t.highlightCardBg },
        line: { color: t.primary, width: 1.5 }
      });
      slide.addShape(pres.ShapeType.roundRect, {
        x: 7.1, y: 2.4, w: 5.1, h: 0.45,
        rectRadius: 0.06,
        fill: { color: t.primary },
        line: { color: t.primary, width: 1 }
      });
      slide.addText(s.rightCol.header, {
        x: 7.1, y: 2.4, w: 5.1, h: 0.45,
        fontSize: 10.5, bold: true, color: 'FFFFFF',
        align: 'center', valign: 'middle'
      });
      let rightY = 3.05;
      for (const item of s.rightCol.items) {
        slide.addShape(pres.ShapeType.roundRect, {
          x: 7.1, y: rightY, w: 0.12, h: 0.3,
          rectRadius: 0.04, fill: { color: t.secondary }, line: { color: t.secondary }
        });
        slide.addText(item, {
          x: 7.35, y: rightY - 0.05, w: 4.85, h: 1.05,
          fontSize: 11, color: t.bodyText, valign: 'top'
        });
        rightY += 1.15;
      }
    }

    // -------------------------------------------------------------
    // TEMPLATE 3: 3 VERTICAL PILLAR CARDS
    // -------------------------------------------------------------
    else if (s.layoutType === 'grid3' && s.cards) {
      for (let cIdx = 0; cIdx < s.cards.length; cIdx++) {
        const card = s.cards[cIdx];
        const cardX = 0.8 + cIdx * 4.0;
        slide.addShape(pres.ShapeType.roundRect, {
          x: cardX, y: 2.15, w: 3.75, h: 4.65,
          rectRadius: 0.08,
          fill: { color: t.cardBg },
          line: { color: t.cardBorder, width: 1 }
        });
        // Top accent line inside card
        slide.addShape(pres.ShapeType.rect, {
          x: cardX, y: 2.15, w: 3.75, h: 0.08,
          fill: { color: t.primary }, line: { color: t.primary }
        });
        // Number badge
        slide.addText(card.num, {
          x: cardX + 0.3, y: 2.35, w: 1.0, h: 0.5,
          fontSize: 22, bold: true, color: t.primary
        });
        // Card Title
        slide.addText(card.title, {
          x: cardX + 0.3, y: 2.85, w: 3.15, h: 0.6,
          fontSize: 13, bold: true, color: t.titleText, valign: 'middle'
        });
        // Card Bullets
        let bY = 3.55;
        for (const bullet of card.bullets) {
          slide.addShape(pres.ShapeType.roundRect, {
            x: cardX + 0.3, y: bY + 0.05, w: 0.1, h: 0.25,
            rectRadius: 0.03, fill: { color: t.secondary }, line: { color: t.secondary }
          });
          slide.addText(bullet, {
            x: cardX + 0.5, y: bY, w: 2.95, h: 0.95,
            fontSize: 10.5, color: t.bodyText, valign: 'top'
          });
          bY += 1.0;
        }
      }
    }

    // -------------------------------------------------------------
    // TEMPLATE 4: 4 QUADRANT CARDS (2x2)
    // -------------------------------------------------------------
    else if (s.layoutType === 'grid4' && s.cards) {
      for (let cIdx = 0; cIdx < s.cards.length; cIdx++) {
        const card = s.cards[cIdx];
        const row = Math.floor(cIdx / 2);
        const col = cIdx % 2;
        const cardX = col === 0 ? 0.8 : 6.8;
        const cardY = row === 0 ? 2.15 : 4.55;

        slide.addShape(pres.ShapeType.roundRect, {
          x: cardX, y: cardY, w: 5.7, h: 2.25,
          rectRadius: 0.08,
          fill: { color: t.cardBg },
          line: { color: t.cardBorder, width: 1 }
        });
        // Left accent bar
        slide.addShape(pres.ShapeType.rect, {
          x: cardX, y: cardY, w: 0.1, h: 2.25,
          fill: { color: t.primary }, line: { color: t.primary }
        });
        // Category Pill
        slide.addText(card.tag, {
          x: cardX + 0.35, y: cardY + 0.2, w: 5.0, h: 0.25,
          fontSize: 9, bold: true, color: t.primary
        });
        // Title
        slide.addText(card.title, {
          x: cardX + 0.35, y: cardY + 0.45, w: 5.0, h: 0.45,
          fontSize: 13, bold: true, color: t.titleText, valign: 'middle'
        });
        // Description
        slide.addText(card.desc, {
          x: cardX + 0.35, y: cardY + 0.95, w: 5.0, h: 1.1,
          fontSize: 10.5, color: t.bodyText, valign: 'top'
        });
      }
    }

    // -------------------------------------------------------------
    // TEMPLATE 5: BIG KPI METRICS DASHBOARD
    // -------------------------------------------------------------
    else if (s.layoutType === 'metrics' && s.metrics) {
      for (let mIdx = 0; mIdx < s.metrics.length; mIdx++) {
        const met = s.metrics[mIdx];
        const metX = 0.8 + mIdx * 3.0;
        slide.addShape(pres.ShapeType.roundRect, {
          x: metX, y: 2.15, w: 2.75, h: 4.65,
          rectRadius: 0.08,
          fill: { color: t.cardBg },
          line: { color: t.cardBorder, width: 1 }
        });
        // Top accent
        slide.addShape(pres.ShapeType.rect, {
          x: metX, y: 2.15, w: 2.75, h: 0.08,
          fill: { color: t.secondary }, line: { color: t.secondary }
        });
        // Big number callout
        slide.addText(met.value, {
          x: metX + 0.2, y: 2.5, w: 2.35, h: 1.0,
          fontSize: 34, bold: true, color: t.secondary,
          align: 'center', valign: 'middle'
        });
        // Metric label
        slide.addText(met.label, {
          x: metX + 0.2, y: 3.6, w: 2.35, h: 0.6,
          fontSize: 13, bold: true, color: t.titleText,
          align: 'center', valign: 'middle'
        });
        // Divider inside card
        slide.addShape(pres.ShapeType.line, {
          x: metX + 0.3, y: 4.3, w: 2.15, h: 0,
          line: { color: t.cardBorder, width: 1 }
        });
        // Explanation note
        slide.addText(met.note, {
          x: metX + 0.2, y: 4.5, w: 2.35, h: 1.8,
          fontSize: 10.5, color: t.mutedText,
          align: 'center', valign: 'top'
        });
      }
    }

    // -------------------------------------------------------------
    // TEMPLATE 6: HORIZONTAL PROCESS FLOW
    // -------------------------------------------------------------
    else if (s.layoutType === 'flow' && s.steps) {
      for (let fIdx = 0; fIdx < s.steps.length; fIdx++) {
        const step = s.steps[fIdx];
        const stepX = 0.8 + fIdx * 3.0;
        slide.addShape(pres.ShapeType.roundRect, {
          x: stepX, y: 2.3, w: 2.75, h: 4.4,
          rectRadius: 0.08,
          fill: { color: t.cardBg },
          line: { color: t.cardBorder, width: 1 }
        });
        // Step pill
        slide.addShape(pres.ShapeType.roundRect, {
          x: stepX + 0.3, y: 2.55, w: 1.2, h: 0.35,
          rectRadius: 0.06, fill: { color: t.badgeBg }, line: { color: t.cardBorder }
        });
        slide.addText(`STEP ${step.step}`, {
          x: stepX + 0.3, y: 2.55, w: 1.2, h: 0.35,
          fontSize: 9, bold: true, color: t.badgeText,
          align: 'center', valign: 'middle'
        });
        // Title
        slide.addText(step.title, {
          x: stepX + 0.3, y: 3.1, w: 2.15, h: 0.6,
          fontSize: 13, bold: true, color: t.titleText, valign: 'middle'
        });
        // Description
        slide.addText(step.desc, {
          x: stepX + 0.3, y: 3.8, w: 2.15, h: 2.6,
          fontSize: 10.5, color: t.bodyText, valign: 'top'
        });
      }
    }

    // -------------------------------------------------------------
    // TEMPLATE 7: VISION & QUOTE SLIDE
    // -------------------------------------------------------------
    else if (s.layoutType === 'quote' && s.quote) {
      // Big quotation card
      slide.addShape(pres.ShapeType.roundRect, {
        x: 0.8, y: 2.15, w: 11.7, h: 2.1,
        rectRadius: 0.08,
        fill: { color: t.highlightCardBg },
        line: { color: t.primary, width: 1.5 }
      });
      slide.addText(s.quote, {
        x: 1.2, y: 2.3, w: 10.9, h: 1.2,
        fontSize: 14, italic: true, bold: true, color: t.titleText,
        valign: 'middle'
      });
      slide.addText(s.author, {
        x: 1.2, y: 3.6, w: 10.9, h: 0.4,
        fontSize: 10.5, bold: true, color: t.primary
      });

      // 3 Takeaway Cards below
      const points = s.points || [];
      for (let pIdx = 0; pIdx < points.length; pIdx++) {
        const pX = 0.8 + pIdx * 4.0;
        slide.addShape(pres.ShapeType.roundRect, {
          x: pX, y: 4.45, w: 3.75, h: 2.35,
          rectRadius: 0.08,
          fill: { color: t.cardBg },
          line: { color: t.cardBorder, width: 1 }
        });
        slide.addShape(pres.ShapeType.rect, {
          x: pX, y: 4.45, w: 0.1, h: 2.35,
          fill: { color: t.secondary }, line: { color: t.secondary }
        });
        slide.addText(points[pIdx], {
          x: pX + 0.3, y: 4.65, w: 3.25, h: 1.9,
          fontSize: 10.5, color: t.bodyText, valign: 'middle'
        });
      }
    }

    // -------------------------------------------------------------
    // TEMPLATE 8: STRATEGIC ROADMAP PHASES
    // -------------------------------------------------------------
    else if (s.layoutType === 'roadmap' && s.phases) {
      for (let rIdx = 0; rIdx < s.phases.length; rIdx++) {
        const ph = s.phases[rIdx];
        const rX = 0.8 + rIdx * 4.0;
        slide.addShape(pres.ShapeType.roundRect, {
          x: rX, y: 2.15, w: 3.75, h: 4.65,
          rectRadius: 0.08,
          fill: { color: t.cardBg },
          line: { color: t.cardBorder, width: 1 }
        });
        // Status badge
        slide.addShape(pres.ShapeType.roundRect, {
          x: rX + 0.3, y: 2.4, w: 1.8, h: 0.35,
          rectRadius: 0.06,
          fill: { color: ph.status === 'COMPLETED' ? '065F46' : (ph.status.includes('ACTIVE') ? t.badgeBg : t.cardBorder) },
          line: { color: t.cardBorder }
        });
        slide.addText(ph.status, {
          x: rX + 0.3, y: 2.4, w: 1.8, h: 0.35,
          fontSize: 8.5, bold: true, color: 'FFFFFF',
          align: 'center', valign: 'middle'
        });
        // Phase Title
        slide.addText(ph.phase, {
          x: rX + 0.3, y: 2.9, w: 3.15, h: 0.5,
          fontSize: 13, bold: true, color: t.titleText, valign: 'middle'
        });
        // Bullets
        let bulletY = 3.55;
        for (const b of ph.bullets) {
          slide.addShape(pres.ShapeType.roundRect, {
            x: rX + 0.3, y: bulletY + 0.05, w: 0.1, h: 0.25,
            rectRadius: 0.03, fill: { color: t.primary }, line: { color: t.primary }
          });
          slide.addText(b, {
            x: rX + 0.5, y: bulletY, w: 2.95, h: 0.95,
            fontSize: 10.5, color: t.bodyText, valign: 'top'
          });
          bulletY += 1.0;
        }
      }
    }

    // -------------------------------------------------------------
    // TEMPLATE 9: FEATURE CARDS / LIST (DEFAULT STACK)
    // -------------------------------------------------------------
    else {
      const items = s.cards || s.items || (s.body ? s.body.map(b => ({ title: b, desc: '' })) : []);
      const count = Math.min(items.length, 3);
      for (let itIdx = 0; itIdx < count; itIdx++) {
        const item = items[itIdx];
        const cardY = 2.15 + itIdx * 1.55;
        slide.addShape(pres.ShapeType.roundRect, {
          x: 0.8, y: cardY, w: 11.7, h: 1.4,
          rectRadius: 0.08,
          fill: { color: t.cardBg },
          line: { color: t.cardBorder, width: 1 }
        });
        slide.addShape(pres.ShapeType.rect, {
          x: 0.8, y: cardY, w: 0.12, h: 1.4,
          fill: { color: t.primary }, line: { color: t.primary }
        });
        if (item.tag) {
          slide.addText(item.tag, {
            x: 1.2, y: cardY + 0.15, w: 10.8, h: 0.25,
            fontSize: 9, bold: true, color: t.primary
          });
        }
        slide.addText(item.title, {
          x: 1.2, y: cardY + (item.tag ? 0.4 : 0.2), w: 10.8, h: 0.45,
          fontSize: 13, bold: true, color: t.titleText, valign: 'middle'
        });
        if (item.desc) {
          slide.addText(item.desc, {
            x: 1.2, y: cardY + 0.85, w: 10.8, h: 0.45,
            fontSize: 10.5, color: t.bodyText, valign: 'top'
          });
        }
      }
    }
  }

  await pres.writeFile({ fileName: outputPath });
  const stats = fs.statSync(outputPath);
  return { slideCount: slides.length, fileSize: stats.size, themeName: t.name };
}

/**
 * Main Entry Point: Generate Complete Document from User Prompt
 */
export async function generateDocumentFromPrompt({ prompt, language, user, uploadsDir }) {
  const analysis = analyzeDocPrompt(prompt);
  const { format, category, topic, slideCount = 12, theme = 'dark', isLightTheme = false } = analysis;

  const timestamp = Date.now();
  const safeTopic = sanitizeFilename(topic);
  const filename = `AI_Copilot_${safeTopic}_${timestamp}.${format}`;
  const outputPath = path.join(uploadsDir, filename);

  let meta = {};

  if (format === 'pptx') {
    meta = await buildPptx(outputPath, { category, topic, slideCount, theme, prompt, user });
  } else if (format === 'docx') {
    meta = await buildDocx(outputPath, { category, topic, user });
  } else if (format === 'xlsx') {
    meta = await buildXlsx(outputPath, { category, topic, user });
  } else {
    // Default PDF (including landscape presentation if requested as PDF)
    meta = await buildPdf(outputPath, { category, topic, slideCount, theme, isLightTheme, prompt, user });
  }

  const stats = fs.statSync(outputPath);

  let operationTitle = `Generated ${format.toUpperCase()} Document: ${topic}`;
  if (format === 'pptx' || category === 'presentation') {
    const activeTheme = PRESENTATION_THEMES[theme] || PRESENTATION_THEMES.dark;
    operationTitle = `Generated ${meta.slideCount || slideCount}-Slide ${activeTheme.name} Presentation: ${topic}`;
  }
  operationTitle = operationTitle.substring(0, 100);

  return {
    outputPath,
    outFilename: filename,
    outExt: format,
    size: stats.size,
    category,
    topic,
    theme,
    themeName: PRESENTATION_THEMES[theme]?.name || 'Cyber Obsidian Dark',
    slideCount: meta.slideCount || slideCount,
    isLightTheme,
    operationTitle
  };
}
