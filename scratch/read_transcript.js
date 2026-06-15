const fs = require('fs');
const path = require('path');

const conversationId = '76815263-a1d5-4a7c-9225-42da32e1edb5';
const logDir = path.join('C:', 'Users', 'Nacho Perez', '.gemini', 'antigravity', 'brain', conversationId, '.system_generated', 'logs');
const transcriptPath = path.join(logDir, 'transcript.jsonl');

if (!fs.existsSync(transcriptPath)) {
  console.log(`Transcript not found at ${transcriptPath}`);
  process.exit(0);
}

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
console.log(`Read ${lines.length} lines from transcript.`);

lines.forEach((line, idx) => {
  if (!line.trim()) return;
  try {
    const obj = JSON.parse(line);
    // Look for occurrences of "Prob_80" or "80" along with dates
    const content = JSON.stringify(obj.content || obj.tool_calls || '');
    if (content.includes('Prob_80') || content.includes('prob_80') || content.includes('80')) {
      if (content.includes('start_at') || content.includes('fecha') || content.includes('date') || content.includes('2026-04-07')) {
        console.log(`--- Line ${idx} (Type: ${obj.type}, Source: ${obj.source}) ---`);
        console.log(content.slice(0, 1000));
      }
    }
  } catch (e) {
    // ignore
  }
});
