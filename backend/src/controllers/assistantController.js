import path from 'path';
import fs from 'fs';
import { query } from '../database/db.js';
import { saveBufferAsMediaVaultFile } from '../utils/vaultFileSaver.js';
import * as assistantService from '../services/assistantService.js';
import * as docGenService from '../services/docGenService.js';

export async function handleAssistantChat(req, res, next) {
  try {
    const userId = req.user.id;
    const { message = '', fileId } = req.body;
    const uploadDir = path.resolve(process.cwd(), 'uploads');

    let inputPath = null;
    let originalName = null;
    let ext = '';

    // Check if new file uploaded directly in chat
    if (req.file) {
      inputPath = req.file.path;
      originalName = req.file.originalname;
      ext = path.extname(originalName).replace('.', '').toLowerCase();
    }
    // Check if selecting an existing file from MediaVault
    else if (fileId) {
      const fileRes = await query('SELECT * FROM files WHERE id = $1 AND user_id = $2', [fileId, userId]);
      if (fileRes.rows.length > 0) {
        const row = fileRes.rows[0];
        inputPath = path.resolve(row.file_path);
        originalName = row.original_name;
        ext = (row.extension || path.extname(originalName).replace('.', '')).toLowerCase();
      }
    }

    const lang = assistantService.detectLanguage(message);

    // CASE 1: No file attached OR user explicitly asking to create/ready a new document like ChatGPT
    if ((!inputPath || !fs.existsSync(inputPath)) || docGenService.isDocCreationRequest(message)) {
      if (docGenService.isDocCreationRequest(message)) {
        // Generate new document (PDF, Word DOCX, Excel XLSX, PPT Presentation)
        const genResult = await docGenService.generateDocumentFromPrompt({
          prompt: message,
          language: lang,
          user: req.user,
          uploadsDir: uploadDir
        });

        // Persist newly generated document into user's MediaVault files
        const outputBuffer = fs.readFileSync(genResult.outputPath);
        const safeSummary = `AI Copilot: ${genResult.operationTitle}`.substring(0, 240);
        const savedFile = await saveBufferAsMediaVaultFile(
          userId,
          outputBuffer,
          genResult.outFilename,
          { summary: safeSummary }
        );

        let reply = '';
        const isPres = genResult.outExt === 'pptx' || genResult.category === 'presentation';
        const themeLabel = genResult.themeName || (genResult.isLightTheme ? 'Silicon Valley Light' : 'Cyber Obsidian Dark');

        if (lang === 'tanglish') {
          if (isPres) {
            reply = `Kandippa! Neenga ketta "${genResult.topic}" ${genResult.slideCount || 12}-slide premium ${themeLabel} presentation-ah PowerPoint (${genResult.outExt.toUpperCase()}) format-la successfully ready panni mudichiten! Different elegant templates: Hero Cover, 2-Column Split, 3 Strategic Pillars, 4-Quadrant Tech Stack, Big KPI Metrics & Strategic Roadmap ellam executive visual cards & typography-oda structured-ah iruku. Keela irunthu download pannikonga! 📽️✨`;
          } else {
            reply = `Kandippa! Neenga ketta "${genResult.topic}" document-ah ${genResult.outExt.toUpperCase()} format-la successfully generate panni mudichiten! Professional formatting, tables & structured layout ellamae serthu iruku. Keela irunthu direct-ah preview pathutu download pannikonga! 👍📄✨`;
          }
        } else if (lang === 'tamil') {
          if (isPres) {
            reply = `நிச்சயமாக! நீங்கள் கேட்ட "${genResult.topic}" ${genResult.slideCount || 12}-ஸ்லைடு பிரீமியம் ${themeLabel} பிரசன்டேஷனை பவர்பாயிண்ட் (${genResult.outExt.toUpperCase()}) வடிவில் வெற்றிகரமாகத் தயார் செய்துவிட்டேன்! இதில் கவர் ஸ்லைடு, ஒப்பீட்டு அட்டவணை, முக்கிய தூண்கள், 4-அடுக்கு கட்டமைப்பு, KPI எண்கள் மற்றும் திட்ட வரைபடம் ஆகிய நேர்த்தியான டெம்ப்ளேட்டுகள் சேர்க்கப்பட்டுள்ளன. கீழே உள்ள கார்டிலிருந்து பதிவிறக்கிக் கொள்ளலாம்! 📽️✨`;
          } else {
            reply = `நிச்சயமாக! நீங்கள் கேட்ட "${genResult.topic}" ஆவணத்தை ${genResult.outExt.toUpperCase()} வடிவத்தில் வெற்றிகரமாகத் தயார் செய்துவிட்டேன்! இதில் முறையான தலைப்புகள், கட்டமைப்புகள் மற்றும் அட்டவணைகள் சேர்க்கப்பட்டுள்ளன. கீழே உள்ள கார்டிலிருந்து பதிவிறக்கிக் கொள்ளலாம்! 📄✨`;
          }
        } else {
          if (isPres) {
            reply = `I've successfully created your ${genResult.slideCount || 12}-slide premium ${themeLabel} presentation for "${genResult.topic}" in ${genResult.outExt.toUpperCase()} format! It features diverse executive templates: Hero Cover, 2-Column Comparison, 3 Strategic Pillars, 4-Quadrant Tech Stack, Big KPI Metrics, and Strategic Roadmap. You can download and present it right below! 📽️✨`;
          } else {
            reply = `I've successfully created your requested ${genResult.topic} in ${genResult.outExt.toUpperCase()} format! It has been styled with professional structure, typography, and clean formatting. You can preview and download it right below! 📄✨`;
          }
        }

        return res.json({
          success: true,
          reply,
          operation: genResult.operationTitle,
          file: savedFile,
          downloadUrl: `/api/files/${savedFile.id}/download`,
          previewUrl: `/api/files/${savedFile.id}/preview`,
          outFilename: genResult.outFilename,
          outExt: genResult.outExt,
          size: genResult.size,
          metadata: genResult
        });
      }

      // General ChatGPT conversational response
      let reply = '';
      if (lang === 'tanglish') {
        reply = `Vanakkam! Naan ungaloda MediaVault AI Copilot. ChatGPT mathiri enakku documents (PDF, Word DOCX, Excel XLSX, PPT Slides) ready panna mudiyum, athoda unga files-ah edit & convert panna mudiyum!\n\n**Neenga en kitta direct-ah kekalam:**\n• *"Resume ready panni tha PDF-la"*\n• *"Cloud computing pathi project report Word-la create pannu"*\n• *"Monthly budget tracker Excel sheet ready panni kudu"*\n• *"AI technology pathi 5 slides presentation ready pannu"*\n• *"Freelance web development invoice ready pannu"*\n\nAthoda unga file-ah attach panni: *"Background remove pannu"*, *"Transparent sticker ah mathu"*, *"Last 2 pages remove pannu"* nu sonnalum seiven! Enna document ready pannanum nu sollunga! 🚀📄✨`;
      } else if (lang === 'tamil') {
        reply = `வணக்கம்! நான் உங்கள் மீடியாவால்ட் ஏஐ உதவியாளர் (MediaVault AI Copilot). ChatGPT போல நான் புதிய ஆவணங்களை (PDF, Word DOCX, Excel XLSX, PPT) உருவாக்கவும், பழைய கோப்புகளைத் திருத்தவும் செய்வேன்!\n\n**நீங்கள் என்னிடம் கேட்கலாம்:**\n• *"சாப்ட்வேர் இன்ஜினியர் ரெஸ்யூம் PDF-ல் தயார் செய்து தா"*\n• *"ப்ராஜெக்ட் அறிக்கை வேர்ட் (DOCX) கோப்பாக உருவாக்கு"*\n• *"மாதாந்திர வரவு-செலவு எக்செல் ஷீட் தயார் செய்"*\n• *"செயற்கை நுண்ணறிவு பற்றி பிரசன்டேஷன் ஸ்லைடுகள் உருவாக்கு"*\n\nஉங்களுக்கு என்ன ஆவணம் வேண்டும் என்று கூறுங்கள், உடனடியாகச் செய்து தருகிறேன்! 🚀📄✨`;
      } else {
        reply = `Hello! I am your MediaVault AI Copilot. Just like ChatGPT, I can create complete documents (PDF, Word DOCX, Excel XLSX, PPT Slides) from scratch, as well as edit and convert your existing media!\n\n**You can ask me to:**\n• *"Create a Full Stack Developer resume in PDF"*\n• *"Create a project report on Cloud Computing in Word (DOCX)"*\n• *"Create a monthly budget tracker in Excel (XLSX)"*\n• *"Create a 5-slide presentation on Artificial Intelligence"*\n• *"Generate a freelance services invoice in PDF"*\n\nOr attach any file to remove backgrounds, create transparent stickers, or remove pages. What would you like me to create today? 🚀📄✨`;
      }

      return res.json({
        success: true,
        reply,
        requiresFile: false,
        language: lang
      });
    }

    // CASE 2: File is attached -> Parse intent & Execute
    const parsed = assistantService.parseIntent(message, { ext, originalName });

    if (parsed.intent === 'general_chat') {
      let reply = '';
      if (lang === 'tanglish') {
        reply = `Unga file "${originalName}" attach aagi iruku! Ithula enna panna vendum?
• Transparent Sticker aaka "Sticker ah mathu" nu sollunga
• Background remove panna "Background remove pannu" nu sollunga
• Format convert panna "To PDF" / "To Word" nu sollunga
• Colors adjust panna "Brightness ethu" / "Black & White mathu" nu sollunga`;
      } else if (lang === 'tamil') {
        reply = `உங்கள் கோப்பு "${originalName}" இணைக்கப்பட்டுள்ளது! இதில் என்ன மாற்றம் செய்ய வேண்டும்?
• ஸ்டிக்கராக மாற்ற: "ஸ்டிக்கர் ஆக்கு"
• பின்னணி நீக்க: "பின்னணி நீக்கு"
• வடிவம் மாற்ற: "PDF ஆக மாற்று"
• எடிட் செய்ய: "பிரைட்னஸ் கூட்டு"`;
      } else {
        reply = `I have received your file "${originalName}". How would you like me to process it? You can ask me to:
• "Make it a transparent sticker"
• "Remove the background"
• "Convert to PDF / Word / Excel"
• "Increase brightness / contrast / grayscale"
• "Compress file size"`;
      }

      return res.json({
        success: true,
        reply,
        fileReceived: true,
        originalName,
        language: lang
      });
    }

    // Execute requested edit / conversion
    const actionResult = await assistantService.executeAssistantAction(parsed, inputPath, originalName, uploadDir);

    // Persist result into MediaVault files table
    const outputBuffer = fs.readFileSync(actionResult.outputPath);
    const safeSummary = `AI Assistant: ${actionResult.operationTitle}`.substring(0, 240);
    const savedFile = await saveBufferAsMediaVaultFile(
      userId,
      outputBuffer,
      actionResult.outFilename,
      { summary: safeSummary }
    );

    // Build intelligent conversational reply
    const replyText = assistantService.buildAssistantResponse(parsed, actionResult);

    // Generate base64 preview for images and stickers
    const isImageLike = ['webp', 'png', 'jpg', 'jpeg', 'gif'].includes(actionResult.outExt);
    const previewUrl = isImageLike
      ? `data:image/${actionResult.outExt === 'jpg' ? 'jpeg' : actionResult.outExt};base64,${outputBuffer.toString('base64')}`
      : null;

    res.json({
      success: true,
      reply: replyText,
      operation: actionResult.operationTitle,
      file: savedFile,
      downloadUrl: `/api/files/${savedFile.id}/download`,
      previewUrl: previewUrl || `/api/files/${savedFile.id}/download`,
      outFilename: actionResult.outFilename,
      outExt: actionResult.outExt,
      size: actionResult.size,
      metadata: actionResult.metadata
    });
  } catch (err) {
    next(err);
  }
}

