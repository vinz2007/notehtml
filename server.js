require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { analyzeNote, EXPENSE_CATEGORIES } = require("./lib/gemini");
const store = require("./lib/store");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- GHI CHÚ ----------

app.get("/api/notes", (req, res) => {
  const notes = store.getNotes().sort((a, b) => b.createdAt - a.createdAt);
  res.json(notes);
});

app.post("/api/notes", async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Nội dung ghi chú không được để trống." });
  }

  try {
    const analysis = await analyzeNote(content.trim());

    const note = {
      id: store.genId(),
      content: content.trim(),
      createdAt: Date.now(),
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      tags: analysis.tags,
      linkedExpenseId: null,
    };

    let createdExpense = null;
    if (analysis.isExpense && analysis.expense) {
      createdExpense = {
        id: store.genId(),
        amount: analysis.expense.amount,
        category: analysis.expense.category,
        description: analysis.expense.description,
        type: analysis.expense.type,
        date: Date.now(),
        noteId: note.id,
        source: "ai",
      };
      note.linkedExpenseId = createdExpense.id;

      const expenses = store.getExpenses();
      expenses.push(createdExpense);
      store.saveExpenses(expenses);
    }

    const notes = store.getNotes();
    notes.push(note);
    store.saveNotes(notes);

    res.status(201).json({ note, expense: createdExpense });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Lỗi khi phân tích ghi chú bằng AI." });
  }
});

app.delete("/api/notes/:id", (req, res) => {
  const notes = store.getNotes();
  const note = notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: "Không tìm thấy ghi chú." });

  store.saveNotes(notes.filter((n) => n.id !== req.params.id));

  if (note.linkedExpenseId) {
    const expenses = store.getExpenses();
    store.saveExpenses(expenses.filter((e) => e.id !== note.linkedExpenseId));
  }

  res.json({ ok: true });
});

// ---------- CHI TIÊU ----------

app.get("/api/expenses", (req, res) => {
  const expenses = store.getExpenses().sort((a, b) => b.date - a.date);
  res.json(expenses);
});

app.post("/api/expenses", (req, res) => {
  const { amount, category, description, type, date } = req.body;
  if (!amount || isNaN(Number(amount))) {
    return res.status(400).json({ error: "Số tiền không hợp lệ." });
  }

  const expense = {
    id: store.genId(),
    amount: Number(amount),
    category: EXPENSE_CATEGORIES.includes(category) ? category : "Khác",
    description: description || "",
    type: type === "thu" ? "thu" : "chi",
    date: date ? new Date(date).getTime() : Date.now(),
    noteId: null,
    source: "manual",
  };

  const expenses = store.getExpenses();
  expenses.push(expense);
  store.saveExpenses(expenses);

  res.status(201).json(expense);
});

app.delete("/api/expenses/:id", (req, res) => {
  const expenses = store.getExpenses();
  if (!expenses.find((e) => e.id === req.params.id)) {
    return res.status(404).json({ error: "Không tìm thấy khoản chi tiêu." });
  }
  store.saveExpenses(expenses.filter((e) => e.id !== req.params.id));
  res.json({ ok: true });
});

app.get("/api/expenses/summary", (req, res) => {
  const expenses = store.getExpenses();
  const byCategory = {};
  let totalChi = 0;
  let totalThu = 0;

  for (const e of expenses) {
    if (e.type === "chi") {
      totalChi += e.amount;
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    } else {
      totalThu += e.amount;
    }
  }

  res.json({
    totalChi,
    totalThu,
    balance: totalThu - totalChi,
    byCategory,
    categories: EXPENSE_CATEGORIES,
  });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server đang chạy tại http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠ Chưa thiết lập GEMINI_API_KEY trong .env — tính năng AI sẽ báo lỗi.");
  }
});
