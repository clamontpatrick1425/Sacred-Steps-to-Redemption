import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { WeeklyTheme, SavedEntries, JournalResponses } from '../types';

export interface CurrentWeekPDFExportOptions {
  entry: WeeklyTheme;
  responses: Partial<JournalResponses>;
  imageUrl?: string | null;
  summary?: string | null;
  user?: { name?: string; email?: string } | null;
  targetElement?: HTMLElement | null;
}

export interface PDFExportOptions {
  user?: { name: string; email?: string } | null;
  savedEntries: SavedEntries;
  themes: WeeklyTheme[];
  reflectionStreak?: number;
  completedWeeksCount?: number;
  targetWeek?: number; // If specified, export only that single week
}

/**
 * Escapes HTML characters for safe injection into print templates
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Exports the current week's journal responses into a formatted, high-resolution PDF document
 * using html2canvas to render pixel-perfect editorial typography and jsPDF to assemble multi-page Letter format.
 */
export async function exportCurrentWeekToPDFWithCanvas({
  entry,
  responses,
  imageUrl,
  summary,
  user,
  targetElement,
}: CurrentWeekPDFExportOptions): Promise<{ success: boolean; fileName: string; error?: string }> {
  const pilgrimName = user?.name?.trim() ? user.name : 'Fellow Pilgrim';
  const exportDateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const cleanName = pilgrimName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Sacred_Steps_Week_${entry.week}_${cleanName}.pdf`;

  let elementToCapture: HTMLElement | null = targetElement || null;
  let createdOffscreenElement: HTMLElement | null = null;

  try {
    // If no existing visible DOM element was passed, create a pristine styled container
    if (!elementToCapture) {
      createdOffscreenElement = document.createElement('div');
      createdOffscreenElement.style.position = 'fixed';
      createdOffscreenElement.style.left = '-9999px';
      createdOffscreenElement.style.top = '0';
      createdOffscreenElement.style.width = '780px';
      createdOffscreenElement.style.zIndex = '-9999';
      createdOffscreenElement.style.backgroundColor = '#FFFFFF';
      createdOffscreenElement.style.color = '#1E293B';
      createdOffscreenElement.style.fontFamily = 'Georgia, Cambria, "Times New Roman", Times, serif';
      createdOffscreenElement.style.padding = '36px 40px';
      createdOffscreenElement.style.boxSizing = 'border-box';

      // Build responses content
      const hasResponses = responses && Object.values(responses).some(
        (val) => typeof val === 'string' && val.trim().length > 0
      );

      createdOffscreenElement.innerHTML = `
        <div style="font-family: system-ui, -apple-system, sans-serif; text-align: center; border-bottom: 2px solid #D4AF37; padding-bottom: 20px; margin-bottom: 24px;">
          <div style="display: inline-block; border: 1px solid #D4AF37; border-radius: 9999px; padding: 3px 14px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #1C2A39; background-color: #FAF5E9; margin-bottom: 8px;">
            VERSION 1.0 • 2026 EDITION
          </div>
          <h1 style="font-family: 'Cinzel', Georgia, serif; font-size: 26px; font-weight: 800; color: #1C2A39; letter-spacing: 0.05em; margin: 4px 0 6px 0;">
            SACRED STEPS TO REDEMPTION: THE YEAR OF GRACE
          </h1>
          <p style="font-family: Georgia, serif; font-style: italic; font-size: 14px; color: #475569; margin: 0 0 6px 0;">
            A 52-Week Recovery Journal of Reflection, Gratitude &amp; Prayer
          </p>
          <p style="font-size: 11px; color: #64748B; margin: 0 0 8px 0;">
            Authored by C. Lamont Patrick • Published by Kya Daisy Publishing (Copyright © 2025)
          </p>
          <p style="font-size: 11px; color: #B45309; font-style: italic; font-weight: 600; margin: 0;">
            &ldquo;A Path to Recovery, A Life in Grace.&rdquo; • &ldquo;Sustained Walking, Daily Freedom.&rdquo;
          </p>
        </div>

        <!-- Pilgrim Info Banner -->
        <div style="font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: space-between; align-items: center; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 16px; margin-bottom: 22px; font-size: 11px; color: #334155;">
          <div><strong style="color: #0F172A;">PILGRIM:</strong> ${escapeHTML(pilgrimName)}</div>
          <div><strong style="color: #0F172A;">DATE:</strong> ${escapeHTML(exportDateStr)}</div>
          <div><strong style="color: #0F172A;">WEEK:</strong> Week ${entry.week} of 52</div>
        </div>

        <!-- Weekly Focus Header -->
        <div style="background-color: #F8FAFC; border-radius: 10px; border: 1px solid #E2E8F0; border-top: 4px solid #D4AF37; padding: 18px 22px; margin-bottom: 20px;">
          <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 700; color: #B45309; letter-spacing: 0.08em; text-transform: uppercase;">
            WEEK ${entry.week} FOCUS THEME
          </div>
          <h2 style="font-family: 'Cinzel', Georgia, serif; font-size: 22px; font-weight: 700; color: #1C2A39; margin: 6px 0 8px 0;">
            ${escapeHTML(entry.theme)}
          </h2>
          <p style="font-family: Georgia, serif; font-size: 13px; line-height: 1.6; color: #475569; margin: 0;">
            ${escapeHTML(entry.explanation)}
          </p>
        </div>

        <!-- Scripture Anchor & Quote -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px;">
          <div style="background-color: #FDFBF7; border: 1px solid #F1E5D1; border-left: 4px solid #D4AF37; border-radius: 8px; padding: 14px 16px;">
            <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 10px; font-weight: 700; color: #92400E; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
              Scripture Anchor (${escapeHTML(entry.bibleVerse)})
            </div>
            <p style="font-family: Georgia, serif; font-style: italic; font-size: 12.5px; line-height: 1.5; color: #334155; margin: 0 0 6px 0;">
              &ldquo;${escapeHTML(entry.bibleVerseText)}&rdquo;
            </p>
            <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 10px; font-weight: 600; text-align: right; color: #64748B;">
              ${escapeHTML(entry.bibleVerse)}
            </div>
          </div>

          <div style="background-color: #F7FAF8; border: 1px solid #DCE7DE; border-left: 4px solid #7A8B7B; border-radius: 8px; padding: 14px 16px;">
            <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 10px; font-weight: 700; color: #2D5A38; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
              Inspirational Anchor
            </div>
            <p style="font-family: Georgia, serif; font-style: italic; font-size: 12.5px; line-height: 1.5; color: #334155; margin: 0 0 6px 0;">
              &ldquo;${escapeHTML(entry.quote.text)}&rdquo;
            </p>
            <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 10px; font-weight: 600; text-align: right; color: #64748B;">
              — ${escapeHTML(entry.quote.author)}
            </div>
          </div>
        </div>

        ${summary ? `
          <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 14px 18px; margin-bottom: 22px;">
            <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 700; color: #B45309; text-transform: uppercase; margin-bottom: 6px;">
              AI Spiritual Reflection Summary
            </div>
            <p style="font-family: Georgia, serif; font-style: italic; font-size: 12.5px; line-height: 1.6; color: #1E293B; margin: 0; white-space: pre-wrap;">
              ${escapeHTML(summary)}
            </p>
          </div>
        ` : ''}

        <!-- User Journal Responses Section -->
        <div style="margin-bottom: 22px;">
          <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1.5px solid #CBD5E1; padding-bottom: 6px; margin-bottom: 16px;">
            My Written Journal Reflections &amp; Step Work
          </div>

          ${!hasResponses ? `
            <div style="padding: 18px; background-color: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px; text-align: center; color: #64748B; font-size: 12px; font-style: italic;">
              No written responses were entered for this week before exporting.
            </div>
          ` : ''}

          <!-- 1. Primary Prompt -->
          ${entry.prompt ? `
            <div style="margin-bottom: 16px;">
              <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 700; color: #0F172A; margin-bottom: 6px;">
                Primary Reflection Prompt: &ldquo;${escapeHTML(entry.prompt)}&rdquo;
              </div>
              <div style="background-color: #FDFBF7; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px 14px; font-family: Georgia, serif; font-size: 12.5px; line-height: 1.6; color: #1E293B; white-space: pre-wrap;">
                ${responses.promptResponse && responses.promptResponse.trim() ? escapeHTML(responses.promptResponse) : '<span style="color: #94A3B8; font-style: italic;">No response recorded.</span>'}
              </div>
            </div>
          ` : ''}

          <!-- 2. Question 1 -->
          ${entry.reflectionQuestion1 ? `
            <div style="margin-bottom: 16px;">
              <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 700; color: #0F172A; margin-bottom: 6px;">
                Reflection Question 1: &ldquo;${escapeHTML(entry.reflectionQuestion1)}&rdquo;
              </div>
              <div style="background-color: #FDFBF7; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px 14px; font-family: Georgia, serif; font-size: 12.5px; line-height: 1.6; color: #1E293B; white-space: pre-wrap;">
                ${responses.reflection1Response && responses.reflection1Response.trim() ? escapeHTML(responses.reflection1Response) : '<span style="color: #94A3B8; font-style: italic;">No response recorded.</span>'}
              </div>
            </div>
          ` : ''}

          <!-- 3. Question 2 -->
          ${entry.reflectionQuestion2 ? `
            <div style="margin-bottom: 16px;">
              <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 700; color: #0F172A; margin-bottom: 6px;">
                Reflection Question 2: &ldquo;${escapeHTML(entry.reflectionQuestion2)}&rdquo;
              </div>
              <div style="background-color: #FDFBF7; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px 14px; font-family: Georgia, serif; font-size: 12.5px; line-height: 1.6; color: #1E293B; white-space: pre-wrap;">
                ${responses.reflection2Response && responses.reflection2Response.trim() ? escapeHTML(responses.reflection2Response) : '<span style="color: #94A3B8; font-style: italic;">No response recorded.</span>'}
              </div>
            </div>
          ` : ''}

          <!-- 4. Personal Action Goal -->
          ${responses.personalGoal && responses.personalGoal.trim() ? `
            <div style="margin-bottom: 16px;">
              <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 700; color: #047857; margin-bottom: 6px;">
                Personal Action Step / Goal Committed:
              </div>
              <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; padding: 12px 14px; font-family: Georgia, serif; font-size: 12.5px; line-height: 1.6; color: #14532D; white-space: pre-wrap;">
                ${escapeHTML(responses.personalGoal)}
              </div>
            </div>
          ` : ''}

          <!-- 5. Goal Reflection -->
          ${responses.goalReflection && responses.goalReflection.trim() ? `
            <div style="margin-bottom: 16px;">
              <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 700; color: #047857; margin-bottom: 6px;">
                Goal Progress &amp; Accountability Reflection:
              </div>
              <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; padding: 12px 14px; font-family: Georgia, serif; font-size: 12.5px; line-height: 1.6; color: #14532D; white-space: pre-wrap;">
                ${escapeHTML(responses.goalReflection)}
              </div>
            </div>
          ` : ''}

          <!-- 6. Deeper Reflection -->
          ${responses.deeperReflectionResponse && responses.deeperReflectionResponse.trim() ? `
            <div style="margin-bottom: 16px;">
              <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 700; color: #4338CA; margin-bottom: 6px;">
                Deepened Examination &amp; Spiritual Insight:
              </div>
              <div style="background-color: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 6px; padding: 12px 14px; font-family: Georgia, serif; font-size: 12.5px; line-height: 1.6; color: #312E81; white-space: pre-wrap;">
                ${escapeHTML(responses.deeperReflectionResponse)}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Weekly Closing Prayer -->
        ${entry.prayer ? `
          <div style="background-color: #FFFDF5; border: 1px solid #FDE68A; border-top: 3px solid #D4AF37; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
            <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 700; color: #B45309; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
              Weekly Closing Prayer
            </div>
            <p style="font-family: Georgia, serif; font-style: italic; font-size: 13.5px; line-height: 1.6; color: #334155; margin: 0; white-space: pre-wrap;">
              &ldquo;${escapeHTML(entry.prayer)}&rdquo;
            </p>
          </div>
        ` : ''}

        <!-- Official Document Footnote -->
        <div style="font-family: system-ui, -apple-system, sans-serif; border-top: 1px solid #E2E8F0; padding-top: 14px; display: flex; justify-content: space-between; font-size: 9.5px; color: #94A3B8;">
          <div>Sacred Steps to Redemption: The Year of Grace • Confidential Spiritual Journal</div>
          <div>Printed: ${escapeHTML(exportDateStr)}</div>
        </div>
      `;

      document.body.appendChild(createdOffscreenElement);
      elementToCapture = createdOffscreenElement;
    }

    // 1. Capture HTML container into a high-DPI canvas
    const canvas = await html2canvas(elementToCapture, {
      scale: 2, // 2x for sharp retina typography
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FFFFFF',
      logging: false,
    });

    // 2. Initialize jsPDF in Letter format
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 612pt
    const pageHeight = doc.internal.pageSize.getHeight(); // 792pt
    const margin = 32; // 32pt margins
    const pdfContentWidth = pageWidth - margin * 2;
    const pdfContentHeight = pageHeight - margin * 2;

    // Calculate scaling
    const pxPerPt = canvas.width / pdfContentWidth;
    const pageCanvasHeightPx = Math.floor(pdfContentHeight * pxPerPt);

    if (canvas.height <= pageCanvasHeightPx) {
      // Entire content fits on a single page!
      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgHeightPt = (canvas.height * pdfContentWidth) / canvas.width;
      doc.addImage(imgData, 'PNG', margin, margin, pdfContentWidth, imgHeightPt);

      // Single page footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Sacred Steps to Redemption: The Year of Grace • Confidential Recovery Document', margin, pageHeight - 16);
      doc.text('Page 1 of 1', pageWidth - margin, pageHeight - 16, { align: 'right' });
    } else {
      // Content spans multiple pages - slice canvas cleanly across pages
      const totalPages = Math.ceil(canvas.height / pageCanvasHeightPx);

      for (let i = 0; i < totalPages; i++) {
        const sourceY = i * pageCanvasHeightPx;
        const sliceHeight = Math.min(pageCanvasHeightPx, canvas.height - sourceY);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, pageCanvas.width, sliceHeight);
          ctx.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );
        }

        const sliceData = pageCanvas.toDataURL('image/png', 1.0);
        const sliceHeightPt = (sliceHeight * pdfContentWidth) / canvas.width;

        if (i > 0) {
          doc.addPage();
        }

        doc.addImage(sliceData, 'PNG', margin, margin, pdfContentWidth, sliceHeightPt);

        // Running page footer
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          'Sacred Steps to Redemption: The Year of Grace • Confidential Recovery Document',
          margin,
          pageHeight - 16
        );
        doc.text(`Page ${i + 1} of ${totalPages}`, pageWidth - margin, pageHeight - 16, { align: 'right' });
      }
    }

    doc.save(fileName);
    return { success: true, fileName };
  } catch (err) {
    console.error('Canvas PDF export error, falling back to vector PDF:', err);
    // Graceful fallback to pure jsPDF vector export if html2canvas meets any browser limitation
    try {
      const fallbackResult = exportCompletedJournalToPDF({
        user: user ? { name: user.name || 'Fellow Pilgrim' } : null,
        savedEntries: { [entry.week]: responses },
        themes: [entry],
        targetWeek: entry.week,
      });
      return { success: fallbackResult.success, fileName: fallbackResult.fileName };
    } catch (fallbackErr) {
      return {
        success: false,
        fileName,
        error: fallbackErr instanceof Error ? fallbackErr.message : 'Failed to generate PDF document.',
      };
    }
  } finally {
    if (createdOffscreenElement && createdOffscreenElement.parentNode) {
      createdOffscreenElement.parentNode.removeChild(createdOffscreenElement);
    }
  }
}

/**
 * Generates a clean, printable PDF document of completed journal entries using jsPDF.
 */
export function exportCompletedJournalToPDF({
  user,
  savedEntries,
  themes,
  reflectionStreak = 0,
  completedWeeksCount,
  targetWeek,
}: PDFExportOptions): { success: boolean; exportedCount: number; fileName: string } {
  // 1. Identify which weeks have user responses
  const weeksToExport = themes.filter((theme) => {
    if (targetWeek !== undefined) {
      return theme.week === targetWeek;
    }
    const resp = savedEntries[theme.week];
    if (!resp) return false;
    return Object.values(resp).some((val) => typeof val === 'string' && val.trim().length > 0);
  });

  if (weeksToExport.length === 0) {
    return { success: false, exportedCount: 0, fileName: '' };
  }

  // 2. Initialize jsPDF in Letter portrait format
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 44;
  const contentWidth = pageWidth - margin * 2;
  const footerReservedHeight = 45;

  let currentY = margin;

  // Helper to check for page break
  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - footerReservedHeight) {
      doc.addPage();
      currentY = margin + 25; // leave space for running top header
    }
  };

  // Helper to add wrapped section text
  const printWrappedBlock = (
    label: string,
    content: string,
    labelColor: [number, number, number] = [30, 41, 59],
    textColor: [number, number, number] = [51, 65, 85]
  ) => {
    if (!content || content.trim().length === 0) return;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    ensureSpace(20);
    doc.text(label, margin, currentY);
    currentY += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    const lines = doc.splitTextToSize(content, contentWidth - 16);
    const boxHeight = lines.length * 14 + 14;

    ensureSpace(boxHeight + 8);

    // Subtle background card behind answer
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.roundedRect(margin, currentY, contentWidth, boxHeight, 4, 4, 'FD');

    doc.text(lines, margin + 8, currentY + 14);
    currentY += boxHeight + 12;
  };

  // ==========================================
  // COVER / DOCUMENT HEADER BANNER
  // ==========================================
  const pilgrimName = user?.name ? user.name : 'Fellow Pilgrim';
  const exportDateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Top Accent Bar
  doc.setFillColor(180, 83, 9); // Warm Gold / Amber Accent
  doc.rect(margin, currentY, contentWidth, 4, 'F');
  currentY += 16;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('SACRED STEPS TO REDEMPTION: THE YEAR OF GRACE', margin, currentY);
  currentY += 18;

  // Subtitle
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('A 52-Week Recovery Journal of Reflection, Gratitude & Prayer', margin, currentY);
  currentY += 16;

  // Pilgrim Metadata Bar
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, currentY, contentWidth, 34, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`PILGRIM:`, margin + 10, currentY + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(pilgrimName, margin + 58, currentY + 15);

  doc.setFont('helvetica', 'bold');
  doc.text(`DATE:`, margin + 175, currentY + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(exportDateStr, margin + 208, currentY + 15);

  const totalCompleted = completedWeeksCount !== undefined ? completedWeeksCount : weeksToExport.length;
  doc.setFont('helvetica', 'bold');
  doc.text(`WEEKS LOGGED:`, margin + 315, currentY + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(`${totalCompleted} Completed`, margin + 400, currentY + 15);

  if (reflectionStreak > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text(`STREAK:`, margin + 10, currentY + 28);
    doc.setFont('helvetica', 'normal');
    doc.text(`${reflectionStreak} weeks`, margin + 58, currentY + 28);
  }

  currentY += 46;

  // Introductory Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const introNote =
    'This printed document contains your personal, confidential weekly spiritual reflections, inventory answers, and prayer aspirations compiled from your recovery journey. Keep this document secure or share with your sponsor during step work.';
  const introLines = doc.splitTextToSize(introNote, contentWidth);
  doc.text(introLines, margin, currentY);
  currentY += introLines.length * 12 + 14;

  // Thin separator rule
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 20;

  // ==========================================
  // ITERATE OVER COMPLETED WEEKS
  // ==========================================
  weeksToExport.forEach((theme, index) => {
    const responses = savedEntries[theme.week] || {};

    if (index > 0) {
      ensureSpace(160);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(1);
      doc.line(margin, currentY, margin + contentWidth, currentY);
      currentY += 20;
    }

    // Week Header Tag Box
    ensureSpace(45);
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(margin, currentY, contentWidth, 26, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`WEEK ${theme.week}: ${theme.theme.toUpperCase()}`, margin + 10, currentY + 17);
    currentY += 34;

    // Scripture Focus Block
    if (theme.bibleVerse && theme.bibleVerseText) {
      ensureSpace(40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(180, 83, 9); // Amber
      doc.text(`SCRIPTURAL FOUNDATION (${theme.bibleVerse}):`, margin, currentY);
      currentY += 12;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const verseLines = doc.splitTextToSize(`"${theme.bibleVerseText}"`, contentWidth);
      ensureSpace(verseLines.length * 12 + 8);
      doc.text(verseLines, margin, currentY);
      currentY += verseLines.length * 12 + 12;
    }

    // Biblical Aspiration / Theme Explanation
    if (theme.biblicalAspiration) {
      ensureSpace(30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const aspLines = doc.splitTextToSize(`Theme Focus: ${theme.biblicalAspiration}`, contentWidth);
      doc.text(aspLines, margin, currentY);
      currentY += aspLines.length * 11 + 10;
    }

    // --- USER RESPONSES ---
    // 1. Primary Reflection Prompt Response
    if (responses.promptResponse && responses.promptResponse.trim()) {
      const promptTitle = theme.prompt ? `Primary Reflection Prompt: "${theme.prompt}"` : 'Weekly Journal Reflection:';
      printWrappedBlock(promptTitle, responses.promptResponse, [15, 23, 42], [30, 41, 59]);
    }

    // 2. Reflection Question 1 Response
    if (responses.reflection1Response && responses.reflection1Response.trim()) {
      const q1Title = theme.reflectionQuestion1 ? `Reflection Question 1: "${theme.reflectionQuestion1}"` : 'Reflection 1 Response:';
      printWrappedBlock(q1Title, responses.reflection1Response, [15, 23, 42], [30, 41, 59]);
    }

    // 3. Reflection Question 2 Response
    if (responses.reflection2Response && responses.reflection2Response.trim()) {
      const q2Title = theme.reflectionQuestion2 ? `Reflection Question 2: "${theme.reflectionQuestion2}"` : 'Reflection 2 Response:';
      printWrappedBlock(q2Title, responses.reflection2Response, [15, 23, 42], [30, 41, 59]);
    }

    // 4. Personal Goal / Action Step
    if (responses.personalGoal && responses.personalGoal.trim()) {
      printWrappedBlock('Personal Action Step / Goal Committed:', responses.personalGoal, [16, 185, 129], [30, 41, 59]);
    }

    // 5. Goal Reflection
    if (responses.goalReflection && responses.goalReflection.trim()) {
      printWrappedBlock('Personal Goal Reflection / Progress:', responses.goalReflection, [16, 185, 129], [30, 41, 59]);
    }

    // 6. Deeper Reflection Response
    if (responses.deeperReflectionResponse && responses.deeperReflectionResponse.trim()) {
      printWrappedBlock('Deepened Examination & Spiritual Insight:', responses.deeperReflectionResponse, [79, 70, 229], [30, 41, 59]);
    }

    // Weekly Prayer Box (Closing devotion for the week)
    if (theme.prayer) {
      ensureSpace(60);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(180, 83, 9);
      doc.text('WEEKLY PRAYER:', margin, currentY);
      currentY += 12;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const prayerLines = doc.splitTextToSize(`"${theme.prayer}"`, contentWidth - 16);
      const prayerHeight = prayerLines.length * 12 + 12;

      ensureSpace(prayerHeight + 8);
      doc.setFillColor(254, 252, 232); // amber-50
      doc.setDrawColor(251, 191, 36); // amber-400
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, currentY, contentWidth, prayerHeight, 4, 4, 'FD');

      doc.text(prayerLines, margin + 8, currentY + 12);
      currentY += prayerHeight + 16;
    }

    currentY += 8;
  });

  // ==========================================
  // RUNNING HEADERS & FOOTERS ON ALL PAGES
  // ==========================================
  const totalPages = doc.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    if (p > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('SACRED STEPS TO REDEMPTION: THE YEAR OF GRACE • JOURNAL REFLECTIONS', margin, margin - 10);
      doc.text(pilgrimName, pageWidth - margin, margin - 10, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, margin - 4, pageWidth - margin, margin - 4);
    }

    const footerY = pageHeight - margin + 18;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Sacred Steps to Redemption © Kya Daisy Publishing • Confidential Recovery Document', margin, footerY);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
  }

  // 3. Generate clean sanitized filename and save
  const cleanName = pilgrimName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = targetWeek !== undefined
    ? `Sacred_Steps_Week_${targetWeek}_${cleanName}.pdf`
    : `Sacred_Steps_Completed_Journal_${cleanName}.pdf`;

  doc.save(fileName);

  return { success: true, exportedCount: weeksToExport.length, fileName };
}

