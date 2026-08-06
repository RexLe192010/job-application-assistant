/**
 * Basic OmniRoute integration test
 * Prerequisite: run `omniroute` locally and connect at least one provider in the dashboard.
 *
 * Usage:
 *   node test-omniroute.js
 */

const OMNIROUTE_BASE_URL = "http://localhost:20128/v1";

async function requestChatCompletion(body) {
  const response = await fetch(`${OMNIROUTE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
      // Most free providers do not need an extra Authorization header via OmniRoute.
      // If your OmniRoute instance requires a local key, uncomment and set this line:
      // "Authorization": "Bearer YOUR_LOCAL_KEY"
    },
    body: JSON.stringify({
      model: "auto",
      stream: false,
      ...body
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed with status ${response.status}: ${errorText}`);
  }

  return response.json();
}

async function testBasicChat() {
  console.log("Testing basic chat completion...");

  const data = await requestChatCompletion({
    messages: [
      { role: "system", content: "You are a helpful assistant. Reply concisely." },
      { role: "user", content: "Introduce yourself in one sentence and mention your model name if available." }
    ],
    temperature: 0.3
  });

  const reply = data?.choices?.[0]?.message?.content;

  console.log("\n✅ Basic chat succeeded");
  console.log("Reply:", reply);
  console.log("Model/provider used (if returned):", data?.model || "(not specified in response)");
}

async function testJsonModeExtraction() {
  console.log("\nTesting structured JSON extraction (resume-like scenario)...");

  const sampleText = `
    Alex Chen
    Email: zhangsan@example.com
    Phone: 138-1234-5678
    Bachelor of Computer Science, Tsinghua University, 2018-2022
    Software Engineer at ByteDance, 2022-2024
  `;

  const data = await requestChatCompletion({
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You extract structured fields from resume text. Only output valid JSON, no explanation."
      },
      {
        role: "user",
        content: `Extract full_name, email, phone from this text and return as JSON:\n${sampleText}`
      }
    ]
  });

  const content = data?.choices?.[0]?.message?.content;
  console.log("✅ JSON mode response:", content);

  try {
    const parsed = JSON.parse(content);
    console.log("Parsed object:", parsed);
  } catch (err) {
    console.warn("⚠️ Response was not valid JSON. You may need cleanup logic (for example removing markdown fences). ");
  }
}

async function testMultiQuestionQa() {
  console.log("\nTesting multi-question Q&A (general, math, and science)...");

  const questions = [
    "General: In two sentences, explain what cloud computing is.",
    "Math: Compute 37 * 24 and show one short calculation step.",
    "Math: If f(x) = 2x^2 - 3x + 1, what is f(5)?",
    "Science: Why does the sky appear blue in one concise paragraph?",
    "Science: Name the three primary states of matter and give one example of each.",
    "Science: What is Newton's second law in equation form, and what do the symbols mean?"
  ];

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const data = await requestChatCompletion({
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You are a concise tutor. Provide accurate, brief answers."
        },
        {
          role: "user",
          content: question
        }
      ]
    });

    const answer = data?.choices?.[0]?.message?.content || "(empty answer)";
    console.log(`\nQ${index + 1}: ${question}`);
    console.log(`A${index + 1}: ${answer}`);
    console.log(`Route model: ${data?.model || "(not specified)"}`);
  }
}

async function main() {
  try {
    await testBasicChat();
    await testJsonModeExtraction();
    await testMultiQuestionQa();
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("Troubleshooting tips:");
    console.error("1. Confirm the `omniroute` process is still running.");
    console.error("2. Confirm at least one provider is connected and healthy in the dashboard: http://localhost:20128/dashboard");
    console.error("3. Test gateway responsiveness first: curl http://localhost:20128/v1/models");
  }
}

main();
