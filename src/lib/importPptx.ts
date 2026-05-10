import JSZip from 'jszip';
import type { Slide } from './types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function extractTextFromXml(xml: string, tagName: string): string[] {
  const results: string[] = [];
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'g');
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const text = match[1]
      .replace(/<a:r>[\s\S]*?<\/a:r>/g, (runBlock) => {
        const tMatch = runBlock.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/);
        return tMatch ? tMatch[1] : '';
      })
      .replace(/<[^>]+>/g, '')
      .trim();
    if (text) results.push(text);
  }
  return results;
}

function extractNotesFromXml(xml: string): string {
  const texts = extractTextFromXml(xml, 'a:p');
  return texts
    .filter((t) => t && !t.match(/^\d+$/))
    .join('\n')
    .trim();
}

export async function parsePptxFile(file: File): Promise<Slide[]> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
      return numA - numB;
    });

  const slides: Slide[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const slideXml = await zip.files[slideFiles[i]].async('text');
    const textBlocks = extractTextFromXml(slideXml, 'p:txBody');

    const title = textBlocks[0] || '';
    const subtitle = textBlocks[1] || '';
    const bullets = textBlocks.slice(2);

    let speakerNotes = '';
    const noteFile = `ppt/notesSlides/notesSlide${i + 1}.xml`;
    if (zip.files[noteFile]) {
      const notesXml = await zip.files[noteFile].async('text');
      speakerNotes = extractNotesFromXml(notesXml);
    }

    slides.push({
      slide_id: generateId(),
      presentation_id: '',
      slide_index: i,
      local_prompt: '',
      title,
      subtitle,
      bullets,
      image_url: '',
      speaker_notes: speakerNotes,
    });
  }

  return slides;
}
