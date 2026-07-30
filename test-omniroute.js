/**
 * 最简单的 OmniRoute 调用测试
 * 前提：本地已经跑起来 `omniroute`，并且在 dashboard 里连了至少一个 provider
 *
 * 运行方式：
 *   node test-omniroute.js
 */

const OMNIROUTE_BASE_URL = "http://localhost:20128/v1";

async function testBasicChat() {
  console.log("正在测试基础对话调用...");

  const response = await fetch(`${OMNIROUTE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
      // 大部分免费provider走OmniRoute网关不需要单独传Authorization
      // 如果你的OmniRoute设置了本地访问密钥，取消下面这行注释并填入
      // "Authorization": "Bearer YOUR_LOCAL_KEY"
    },
    body: JSON.stringify({
      model: "auto", // 让OmniRoute自动挑选可用的provider/模型
      stream: false,
      messages: [
        { role: "system", content: "You are a helpful assistant. Reply concisely." },
        { role: "user", content: "用一句话介绍一下你自己，并说明你是哪个模型。" }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`请求失败，状态码 ${response.status}：${errorText}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;

  console.log("\n✅ 调用成功！");
  console.log("模型返回：", reply);
  console.log("\n实际使用的模型/provider（如果返回里有）：", data?.model || "(未在响应里标注)");
}

async function testJsonModeExtraction() {
  console.log("\n正在测试结构化JSON输出（模拟简历字段提取场景）...");

  const sampleText = `
    张三
    Email: zhangsan@example.com
    Phone: 138-1234-5678
    Bachelor of Computer Science, Tsinghua University, 2018-2022
    Software Engineer at ByteDance, 2022-2024
  `;

  const response = await fetch(`${OMNIROUTE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "auto",
      stream: false,
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
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`请求失败，状态码 ${response.status}：${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  console.log("✅ JSON模式返回：", content);

  try {
    const parsed = JSON.parse(content);
    console.log("解析后的对象：", parsed);
  } catch (err) {
    console.warn("⚠️ 返回内容不是合法JSON，需要在代码里做清洗（去除```json包裹等）");
  }
}

async function main() {
  try {
    await testBasicChat();
    await testJsonModeExtraction();
  } catch (error) {
    console.error("\n❌ 测试失败：", error.message);
    console.error("排查建议：");
    console.error("1. 确认终端里 `omniroute` 进程是否还在运行");
    console.error("2. 确认 dashboard (http://localhost:20128/dashboard) 里至少连了一个provider，且状态正常");
    console.error("3. 尝试先跑 `curl http://localhost:20128/v1/models` 看看网关本身是否有响应");
  }
}

main();
