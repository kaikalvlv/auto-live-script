import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM = `你是一名专业汽车垂类真人直播内容策划。输出必须是主播可直接照读的中文口语直播稿，不要写成文章或提纲。
原则：用户提供素材优先；不编造实时价格、补贴、政策和配置；信息不足时明确标注待核实。结构使用“结论→原因→适合谁→例子→互动→自然衔接”。互动围绕预算、车型、版本、用途、城市、全款/分期、置换。问完即使没人回复也能继续讲。留资/小程序引导要建立在前面的干货价值上，不能把参考价说成最终成交承诺。每5-8分钟自然埋一次后续价值点，但避免机械重复。章节用【章节｜预计分钟】标记，章节内部全部写成可直接念的话。`;

function clean(v, max = 20000) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "服务器尚未配置 OPENAI_API_KEY" });

  try {
    const body = req.body || {};
    const duration = [30, 60, 90].includes(Number(body.duration)) ? Number(body.duration) : 60;
    const target = duration === 30 ? "4500-6500" : duration === 90 ? "13000-18000" : "9000-12000";
    const goals = Array.isArray(body.goals) ? body.goals.slice(0, 8).join("、") : "停留、互动、关注、自然留资";
    const mode = clean(body.mode, 40) || "完整新稿";
    const input = `
任务模式：${mode}
品牌：${clean(body.brand, 100) || "未指定"}
车型：${clean(body.models, 300) || "未指定"}
直播时长：${duration}分钟
核心主题：${clean(body.topic, 3000) || "车型选择、版本选择、行情与购车避坑"}
直播目标：${goals}
主播风格：${clean(body.style, 500) || "口语化、节奏快、自然、不端着"}
目标篇幅：约${target}中文字。优先保证质量与完整性，不要为了凑字机械重复。

【事实/素材】
${clean(body.facts, 30000) || "无额外素材。不得自行捏造实时行情数字。"}

【参考直播稿】
${clean(body.reference_script, 40000) || "无。"}

要求：先在内部规划整场节奏，然后直接输出完整照读稿。不要输出规划过程，不要解释你怎么写的。参考稿存在时学习其语气、节奏、互动方式和衔接习惯，但不要机械复制原句。若模式为“保留原文优化”或“只改衔接”，最大限度保留参考稿原文。`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
      instructions: SYSTEM,
      input,
      max_output_tokens: duration === 90 ? 30000 : duration === 60 ? 22000 : 14000
    });

    return res.status(200).json({ script: response.output_text || "", model: process.env.OPENAI_MODEL || "gpt-6-luna" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "生成失败，请稍后重试" });
  }
}