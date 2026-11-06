import path from 'path';
import fs from 'fs';
import { query } from '../database/db.js';
import { saveBufferAsMediaVaultFile } from '../utils/vaultFileSaver.js';
import * as assistantService from '../services/assistantService.js';
import * as docGenService from '../services/docGenService.js';
import * as conversionService from '../services/conversionService.js';

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

    // 0. CHECK FIRST: Text to Audio (TTS) Request
    const lowerMsg = message.toLowerCase().trim();
    const isTtsRequest =
      lowerMsg.includes('txt to audio') ||
      lowerMsg.includes('text to audio') ||
      lowerMsg.includes('text to speech') ||
      lowerMsg.includes('txt to speech') ||
      lowerMsg.includes('text to mp3') ||
      lowerMsg.includes('txt to mp3') ||
      lowerMsg.includes('to audio') ||
      lowerMsg.includes('to speech') ||
      lowerMsg.includes('text-ah audio') ||
      lowerMsg.includes('text ah audio') ||
      lowerMsg.includes('audio-va mathu') ||
      lowerMsg.includes('audio va mathu') ||
      lowerMsg.includes('voice-ah mathu') ||
      lowerMsg.includes('voice ah mathu') ||
      lowerMsg.includes('speak this') ||
      lowerMsg.includes('read aloud') ||
      lowerMsg.includes('audio generate') ||
      lowerMsg.includes('ஆடியோவாக மாற்று') ||
      lowerMsg.includes('குரலாக மாற்று');

    if (isTtsRequest) {
      let textToSpeak = message;
      const stripPatterns = [
        /txt\s+to\s+audio/gi,
        /text\s+to\s+audio/gi,
        /text\s+to\s+speech/gi,
        /txt\s+to\s+speech/gi,
        /text\s+to\s+mp3/gi,
        /txt\s+to\s+mp3/gi,
        /to\s+audio/gi,
        /to\s+speech/gi,
        /text-?ah\s+audio-?va\s+mathu/gi,
        /audio-?va\s+mathu/gi,
        /audio\s+va\s+mathu/gi,
        /voice-?ah\s+mathu/gi,
        /voice\s+ah\s+mathu/gi,
        /speak\s+this/gi,
        /read\s+aloud/gi,
        /\btts\b/gi
      ];
      for (const p of stripPatterns) {
        textToSpeak = textToSpeak.replace(p, '').trim();
      }

      // If text in message is too short and there's an attached file, read from attached file!
      if (textToSpeak.length < 5 && inputPath && fs.existsSync(inputPath)) {
        textToSpeak = inputPath; // convertTextToAudio handles docx, pdf, txt files automatically!
      } else if (textToSpeak.length < 5) {
        textToSpeak = 'MediaVault digital asset management and universal converter.';
      }

      const timestamp = Date.now();
      const outFilename = `narration-${timestamp}.mp3`;
      const outputPath = path.join(uploadDir, outFilename);

      await conversionService.convertTextToAudio(textToSpeak, outputPath, {
        language: lang === 'tamil' ? 'ta' : (lang === 'hindi' ? 'hi' : 'en')
      });

      const outputBuffer = fs.readFileSync(outputPath);
      const safeSummary = `AI Copilot: Text to Audio (MP3 Narration)`.substring(0, 240);
      const savedFile = await saveBufferAsMediaVaultFile(
        userId,
        outputBuffer,
        outFilename,
        { summary: safeSummary }
      );

      let reply = '';
      if (lang === 'tanglish') {
        reply = `Super! Neenga kudutha text-ah natural voice MP3 audio-va successfully convert panniten! Keela player-la direct-ah kettu download pannikonga! 🎙️🔊✨`;
      } else if (lang === 'tamil') {
        reply = `அற்புதம்! நீங்கள் அளித்த உரை வெற்றிகரமாக இயற்கை குரல் MP3 ஆடியோவாக மாற்றப்பட்டது! கீழே உள்ள பிளேயரில் நேரடியாகக் கேட்டுப் பதிவிறக்கிக் கொள்ளலாம்! 🎙️🔊✨`;
      } else {
        reply = `I've successfully converted your text into a spoken MP3 audio narration! You can play it directly below or download it. 🎙️🔊✨`;
      }

      return res.json({
        success: true,
        reply,
        operation: 'Text to Audio (MP3 Narration)',
        file: savedFile,
        downloadUrl: `/api/files/${savedFile.id}/download`,
        previewUrl: `/api/files/${savedFile.id}/download`,
        outFilename,
        outExt: 'mp3',
        size: savedFile.size,
        metadata: { language: lang }
      });
    }

    // Check if file is attached
    const hasAttachedFile = !!(inputPath && fs.existsSync(inputPath));
    const parsed = hasAttachedFile
      ? assistantService.parseIntent(message, { ext, originalName })
      : { intent: 'general_chat' };

    // CASE 1: File is attached AND user requested an action/conversion on it
    if (hasAttachedFile && parsed.intent !== 'general_chat') {
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
        : `/api/files/${savedFile.id}/download`;

      return res.json({
        success: true,
        reply: replyText,
        operation: actionResult.operationTitle,
        file: savedFile,
        downloadUrl: `/api/files/${savedFile.id}/download`,
        previewUrl,
        outFilename: actionResult.outFilename,
        outExt: actionResult.outExt,
        size: actionResult.size,
        metadata: actionResult.metadata
      });
    }

    // CASE 2: User explicitly asking to create/ready a new document like ChatGPT from scratch
    if (docGenService.isDocCreationRequest(message)) {
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
        previewUrl: `/api/files/${savedFile.id}/download`,
        outFilename: genResult.outFilename,
        outExt: genResult.outExt,
        size: genResult.size,
        metadata: genResult
      });
    }

    // CASE 3: File is attached but user command was conversational / not recognized
    if (hasAttachedFile) {
      let reply = '';
      if (lang === 'tanglish') {
        reply = `Unga file "${originalName}" attach aagi iruku! Ithula Universal Converter-la iruka ellam conversions-um panna mudiyum:
• Format conversion: "To PDF", "To Word", "To Excel", "To CSV", "To MP3", "To GIF"
• Video & Audio: "Video to GIF", "Extract audio (MP3)", "Audio to Transcript"
• Smart tools: "Remove duplicates", "Reverse GIF", "Create ZIP", "Compress file"
• Visual: "Transparent sticker", "Remove background", "Brightness / Grayscale"`;
      } else if (lang === 'tamil') {
        reply = `உங்கள் கோப்பு "${originalName}" இணைக்கப்பட்டுள்ளது! இதில் அனைத்து வடிவ மாற்றங்களையும் செய்யலாம்:
• கோப்பு மாற்றம்: "PDF ஆக மாற்று", "Word ஆக மாற்று", "Excel ஆக மாற்று", "MP3 ஆக மாற்று"
• வீடியோ & ஆடியோ: "Video to GIF", "ஆடியோவை பிரி (MP3)", "டிரான்ஸ்கிரிப்ட் எடு"
• சிறப்புக் கருவிகள்: "போலி வரிகளை நீக்கு", "Reverse GIF", "ZIP உருவாக்கு", "அளவைச் சுருக்கு"
• புகைப்படங்கள்: "ஸ்டிக்கர் ஆக்கு", "பின்னணி நீக்கு"`;
      } else {
        reply = `I have received your file "${originalName}". All 11 Universal Converter studio tools are available:
• Format Conversions: "Convert to PDF / Word / Excel / CSV / MP3 / GIF"
• Media Studio: "Video to GIF", "Extract Audio to MP3", "Audio to Transcript"
• Smart Utilities: "Remove Duplicate Rows", "Reverse GIF", "Create ZIP Archive", "Compress File"
• Visual Studio: "Make Sticker", "Remove Background", "Adjust Brightness / Contrast"`;
      }

      return res.json({
        success: true,
        reply,
        fileReceived: true,
        originalName,
        language: lang
      });
    }

    // CASE 4: No file attached and conversational general chat
    let reply = '';
    if (lang === 'tanglish') {
      reply = `Vanakkam! Naan ungaloda MediaVault AI Copilot. ChatGPT mathiri enakku documents (PDF, Word DOCX, Excel XLSX, PPT Slides) ready panna mudiyum, athoda Universal Converter-oda 11 studios conversions-um panna mudiyum!\n\n**Neenga en kitta direct-ah kekalam:**\n• *"Resume ready panni tha PDF-la"*\n• *"Cloud computing pathi project report Word-la create pannu"*\n• *"Monthly budget tracker Excel sheet ready panni kudu"*\n• *"AI technology pathi 12 slides presentation ready pannu"*\n\n**Athoda unga file-ah attach panni:**\n• *"Word to PDF"*, *"PDF to Excel"*, *"Excel deduplicate pannu"*\n• *"Video to GIF"*, *"Extract audio to MP3"*, *"Reverse GIF"*\n• *"Audio-va transcript-ah mathu"*, *"Text to audio narration"*\n• *"Background remove pannu"*, *"Transparent sticker"*, *"Create ZIP"*\n\nEnna seiyanum nu sollunga! 🚀📄✨`;
    } else if (lang === 'tamil') {
      reply = `வணக்கம்! நான் உங்கள் மீடியாவால்ட் ஏஐ உதவியாளர் (MediaVault AI Copilot). ChatGPT போல நான் புதிய ஆவணங்களை உருவாக்கவும், அப்ளிகேஷனின் 11 ஸ்டுடியோ மாற்றங்களைச் செய்யவும் செய்வேன்!\n\n**நீங்கள் என்னிடம் கேட்கலாம்:**\n• *"சாப்ட்வேர் இன்ஜினியர் ரெஸ்யூம் PDF-ல் தயார் செய்து தா"*\n• *"ப்ராஜெக்ட் அறிக்கை வேர்ட் (DOCX) கோப்பாக உருவாக்கு"*\n• *"மாதாந்திர வரவு-செலவு எக்செல் ஷீட் தயார் செய்"*\n• *"12 ஸ்லைடுகள் பிரசன்டேஷன் உருவாக்கு"*\n\n**கோப்புகளை இணைத்து:**\n• *"PDF to Word", "Excel duplicate நீக்கு", "Video to GIF"*\n• *"ஆடியோவை பிரி (MP3)", "டிரான்ஸ்கிரிப்ட் எடு", "பின்னணி நீக்கு"*\n\nஉங்களுக்கு என்ன வேண்டும் என்று கூறுங்கள்! 🚀📄✨`;
    } else {
      reply = `Hello! I am your MediaVault AI Copilot. Just like ChatGPT, I can create complete documents (PDF, Word DOCX, Excel XLSX, PPT Slides) from scratch, as well as execute all 11 Universal Converter studio tools directly from chat!\n\n**You can ask me to:**\n• *"Create a Full Stack Developer resume in PDF"*\n• *"Create a project report in Word (DOCX)"*\n• *"Create a monthly budget tracker in Excel (XLSX)"*\n• *"Create a 12-slide presentation in PPT"*\n\n**Or attach any file to:**\n• Convert PDF to Word/Excel/HTML/Images\n• Convert Word to PDF/Excel/Audio\n• Clean duplicate rows in Excel\n• Convert Video to GIF or Extract Audio to MP3\n• Reverse GIF animation or create Stickers\n• Compress files or bundle into ZIP archives\n\nWhat would you like me to do today? 🚀📄✨`;
    }

    return res.json({
      success: true,
      reply,
      requiresFile: false,
      language: lang
    });
  } catch (err) {
    next(err);
  }
}

