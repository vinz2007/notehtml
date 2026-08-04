const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const NOTES_FILE = path.join(DATA_DIR, "notes.json");
const EXPENSES_FILE = path.join(DATA_DIR, "expenses.json");

function ensureFile(filePath) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "[]", "utf-8");
}

function readJSON(filePath) {
  ensureFile(filePath);
  const raw = fs.readFileSync(filePath, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeJSON(filePath, data) {
  ensureFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

module.exports = {
  genId,
  getNotes: () => readJSON(NOTES_FILE),
  saveNotes: (notes) => writeJSON(NOTES_FILE, notes),
  getExpenses: () => readJSON(EXPENSES_FILE),
  saveExpenses: (expenses) => writeJSON(EXPENSES_FILE, expenses),
};
