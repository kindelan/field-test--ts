const fs = require('fs');

const transcriptPath = "C:/Users/Nacho Perez/.gemini/antigravity/brain/76815263-a1d5-4a7c-9225-42da32e1edb5/.system_generated/logs/transcript.jsonl";
const lines = fs.readFileSync(transcriptPath, "utf-8").split("\n");

lines.forEach((line) => {
  if (!line.trim()) return;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index >= 3100 && obj.step_index <= 3165) {
      console.log(`[Step ${obj.step_index}] Source: ${obj.source}, Type: ${obj.type}`);
      if (obj.content) {
        console.log(`Content: ${obj.content.slice(0, 1000)}`);
      }
      if (obj.tool_calls) {
        console.log(`Tool Calls: ${JSON.stringify(obj.tool_calls)}`);
      }
      console.log('-------------------------------------------');
    }
  } catch (e) {}
});
