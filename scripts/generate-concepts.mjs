import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { concepts } from "../data/concepts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateAll() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY is missing.");
    process.exit(1);
  }

  console.log(`Found ${concepts.length} topics. Generating summaries...\n`);

  const output = [];

  for (let i = 0; i < concepts.length; i++) {
    const topic = concepts[i].topic;
    console.log(`🔹 [${i + 1}/${concepts.length}] Generating: ${topic}`);

    const prompt = `
You are creating an 80–100 word explainer for busy product managers.

Topic: "${topic}"

Requirements:
- Explain in clear, simple language
- Focus on what it is and why it matters
- Avoid heavy math
- Make it practically useful for AI PMs
- Keep it 80–100 words
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "user", content: prompt }
      ],
    });

    const text = response.output[0].content[0].text || "";

    output.push({
      topic,
      title: topic,
      summary: text.trim(),
    });
  }

  const outPath = path.join(__dirname, "..", "data", "concepts.generated.ts");

  const content =
    "export const concepts = " +
    JSON.stringify(output, null, 2) +
    " as const;\n";

  fs.writeFileSync(outPath, content, "utf8");

  console.log("\n✅ Completed!");
  console.log("Saved file: data/concepts.generated.ts");
}

generateAll().catch((err) => {
  console.error("❌ Error generating:", err);
  process.exit(1);
});
