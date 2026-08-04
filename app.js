const API = "/api";

// ---------- Helpers ----------
function formatVND(n) {
  return new Intl.NumberFormat("vi-VN").format(n) + " ₫";
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) +
    " · " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Tabs ----------
document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
  if (btn.dataset.tab === "overview") loadOverview();
});

// ---------- API status ----------
async function checkHealth() {
  const dot = document.getElementById("apiStatusDot");
  const text = document.getElementById("apiStatusText");
  try {
    const res = await fetch(`${API}/health`);
    if (res.ok) {
      dot.classList.add("ok");
      text.textContent = "Máy chủ đang chạy";
    } else throw new Error();
  } catch {
    dot.classList.add("err");
    text.textContent = "Không kết nối được máy chủ";
  }
}

// ---------- Notes ----------
async function loadNotes() {
  const list = document.getElementById("notesList");
  const res = await fetch(`${API}/notes`);
  const notes = await res.json();

  if (!notes.length) {
    list.innerHTML = `<div class="empty-state"><p>Chưa có ghi chú nào.</p><p class="empty-sub">Trang giấy đầu tiên đang chờ bạn.</p></div>`;
    return;
  }

  list.innerHTML = notes.map(renderNoteCard).join("");
}

function renderNoteCard(note) {
  const tags = (note.tags || []).map((t) => `<span class="tag">${escapeHTML(t)}</span>`).join("");
  const keyPoints = (note.keyPoints || []).map((k) => `<li>${escapeHTML(k)}</li>`).join("");
  const linkedExpense = note.linkedExpenseId
    ? `<div class="linked-expense">↳ đã tự thêm vào sổ chi tiêu</div>`
    : "";

  return `
    <article class="note-card" data-id="${note.id}">
      <p class="note-content">${escapeHTML(note.content)}</p>
      ${note.summary ? `<p class="note-summary">${escapeHTML(note.summary)}</p>` : ""}
      ${keyPoints ? `<ul class="key-points">${keyPoints}</ul>` : ""}
      ${linkedExpense}
      <div class="note-meta">
        <div class="tag-row">${tags}</div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="note-date">${formatDate(note.createdAt)}</span>
          <button class="delete-btn" onclick="deleteNote('${note.id}')">Xoá</button>
        </div>
      </div>
    </article>`;
}

async function deleteNote(id) {
  await fetch(`${API}/notes/${id}`, { method: "DELETE" });
  loadNotes();
  loadExpenses();
}
window.deleteNote = deleteNote;

document.getElementById("submitNote").addEventListener("click", async () => {
  const textarea = document.getElementById("noteInput");
  const content = textarea.value.trim();
  if (!content) return;

  const btn = document.getElementById("submitNote");
  const label = btn.querySelector(".btn-label");
  const spinner = btn.querySelector(".btn-spinner");
  btn.disabled = true;
  label.textContent = "AI đang đọc…";
  spinner.hidden = false;

  try {
    const res = await fetch(`${API}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Lỗi không xác định");

    textarea.value = "";
    if (data.expense) {
      toast(`Đã tự thêm khoản ${data.expense.type === "chi" ? "chi" : "thu"} ${formatVND(data.expense.amount)} vào sổ`);
    }
    await loadNotes();
    await loadExpenses();
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
    label.textContent = "Ghi & phân tích";
    spinner.hidden = true;
  }
});

// ---------- Expenses ----------
async function loadExpenses() {
  const list = document.getElementById("expensesList");
  const res = await fetch(`${API}/expenses`);
  const expenses = await res.json();

  if (!expenses.length) {
    list.innerHTML = `<div class="empty-state"><p>Sổ chi tiêu còn trống.</p><p class="empty-sub">Ghi chú có nhắc đến tiền sẽ tự xuất hiện ở đây.</p></div>`;
  } else {
    list.innerHTML = expenses.map(renderExpenseRow).join("");
  }

  await loadSummary();
}

function renderExpenseRow(exp) {
  return `
    <div class="receipt-row" data-id="${exp.id}">
      <div class="receipt-left">
        <span class="receipt-desc">${escapeHTML(exp.description || "(không có mô tả)")}</span>
        <span class="receipt-meta">
          <span class="receipt-cat">${escapeHTML(exp.category)}</span>
          ${exp.source === "ai" ? '<span class="ai-badge">✎ AI phát hiện</span>' : ""}
          <span>${formatDate(exp.date)}</span>
        </span>
      </div>
      <div class="receipt-right">
        <span class="receipt-amount ${exp.type}">${exp.type === "chi" ? "−" : "+"}${formatVND(exp.amount)}</span>
        <button class="delete-btn" onclick="deleteExpense('${exp.id}')">Xoá</button>
      </div>
    </div>`;
}

async function deleteExpense(id) {
  await fetch(`${API}/expenses/${id}`, { method: "DELETE" });
  loadExpenses();
}
window.deleteExpense = deleteExpense;

async function loadSummary() {
  const res = await fetch(`${API}/expenses/summary`);
  const s = await res.json();
  document.getElementById("statChi").textContent = formatVND(s.totalChi);
  document.getElementById("statThu").textContent = formatVND(s.totalThu);
  document.getElementById("statBalance").textContent = formatVND(s.balance);
  window.__lastSummary = s;
}

document.getElementById("manualExpenseForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const description = document.getElementById("expDescription").value.trim();
  const amount = Number(document.getElementById("expAmount").value);
  const category = document.getElementById("expCategory").value;
  const type = document.getElementById("expType").value;
  if (!description || !amount) return;

  await fetch(`${API}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description, amount, category, type }),
  });

  e.target.reset();
  loadExpenses();
});

// ---------- Overview ----------
async function loadOverview() {
  const res = await fetch(`${API}/expenses/summary`);
  const s = await res.json();
  const container = document.getElementById("categoryBars");
  const entries = Object.entries(s.byCategory).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    container.innerHTML = `<div class="empty-state"><p>Chưa có dữ liệu chi tiêu.</p></div>`;
    return;
  }

  const max = Math.max(...entries.map(([, v]) => v));
  container.innerHTML = entries.map(([cat, val]) => `
    <div class="cat-bar-row">
      <span class="cat-bar-name">${escapeHTML(cat)}</span>
      <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${(val / max) * 100}%"></div></div>
      <span class="cat-bar-value">${formatVND(val)}</span>
    </div>
  `).join("");
}

// ---------- Init ----------
checkHealth();
loadNotes();
loadExpenses();
