const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const EXPENSE_CATEGORIES = [
  "Ăn uống",
  "Di chuyển",
  "Mua sắm",
  "Hoá đơn",
  "Giải trí",
  "Học tập",
  "Sức khoẻ",
  "Khác",
];

function buildPrompt(content) {
  return `Bạn là trợ lý phân tích ghi chú cá nhân bằng tiếng Việt cho một ứng dụng ghi chú + quản lý chi tiêu.

Cho đoạn ghi chú của người dùng dưới đây, hãy phân tích và trả về CHÍNH XÁC một object JSON theo schema sau, không thêm chữ nào khác, không dùng markdown code fence:

{
  "summary": "tóm tắt ngắn gọn nội dung ghi chú trong 1 câu",
  "keyPoints": ["tối đa 5 ý chính/quan trọng cần ghi nhớ, mỗi ý là 1 câu ngắn gọn"],
  "tags": ["tối đa 3 thẻ phân loại ngắn gọn cho ghi chú"],
  "isExpense": true hoặc false — true nếu ghi chú có nhắc tới một khoản tiền cụ thể (chi tiêu hoặc thu nhập),
  "expense": null hoặc {
    "amount": số tiền dạng số nguyên (đơn vị VNĐ, không có ký tự hay dấu phẩy),
    "category": một trong ${JSON.stringify(EXPENSE_CATEGORIES)},
    "description": "mô tả ngắn gọn khoản này là gì",
    "type": "chi" hoặc "thu"
  }
}

Nếu ghi chú không đề cập số tiền cụ thể nào, isExpense phải là false và expense phải là null.

Ghi chú cần phân tích:
"""${content}"""`;
}

function stripCodeFence(text) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();
}

async function analyzeNote(content) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Thiếu GEMINI_API_KEY trong file .env — lấy key tại https://aistudio.google.com/apikey"
    );
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(content) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API lỗi (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error("Gemini không trả về nội dung hợp lệ.");
  }

  let parsed;
  try {
    parsed = JSON.parse(stripCodeFence(rawText));
  } catch (e) {
    throw new Error("Không parse được JSON từ Gemini: " + rawText);
  }

  // Chuẩn hoá kết quả để tránh lỗi thiếu field
  return {
    summary: parsed.summary || "",
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 5) : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 3) : [],
    isExpense: Boolean(parsed.isExpense) && parsed.expense,
    expense: parsed.isExpense && parsed.expense
      ? {
          amount: Number(parsed.expense.amount) || 0,
          category: EXPENSE_CATEGORIES.includes(parsed.expense.category)
            ? parsed.expense.category
            : "Khác",
          description: parsed.expense.description || "",
          type: parsed.expense.type === "thu" ? "thu" : "chi",
        }
      : null,
  };
}

module.exports = { analyzeNote, EXPENSE_CATEGORIES };
