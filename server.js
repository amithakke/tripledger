const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "state.json");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC_DIR));

const emptyState = {
  expenses: [],
  tripBudget: 0,
  tripDestination: "",
  tripStartDate: "",
  tripEndDate: ""
};

function readState() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { ...emptyState };
    return { ...emptyState, ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) };
  } catch (error) {
    console.error("Could not read saved state:", error.message);
    return { ...emptyState };
  }
}

function writeState(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
}

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "TripLedger" }));

app.get("/api/state", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(readState());
});

app.put("/api/state", (req, res) => {
  const body = req.body || {};
  const expenses = Array.isArray(body.expenses) ? body.expenses : [];
  const tripBudget = Number(body.tripBudget) || 0;

  if (tripBudget < 0 || !Number.isFinite(tripBudget)) {
    return res.status(400).json({ error: "Trip budget must be a valid non-negative number." });
  }
  if (expenses.length > 5000) {
    return res.status(413).json({ error: "Too many expense entries." });
  }

  const state = {
    expenses: expenses.map((expense) => ({
      id: Number(expense.id) || Date.now(),
      description: String(expense.description || "").slice(0, 180),
      amount: Math.max(0, Number(expense.amount) || 0),
      category: String(expense.category || "Other").slice(0, 80),
      date: String(expense.date || "").slice(0, 10),
      payment: String(expense.payment || "Other").slice(0, 60),
      merchant: String(expense.merchant || "").slice(0, 180),
      people: String(expense.people || "").slice(0, 100),
      notes: String(expense.notes || "").slice(0, 1000)
    })),
    tripBudget,
    tripDestination: String(body.tripDestination || "").slice(0, 180),
    tripStartDate: String(body.tripStartDate || "").slice(0, 10),
    tripEndDate: String(body.tripEndDate || "").slice(0, 10)
  };

  try {
    writeState(state);
    res.json({ ok: true, saved: state.expenses.length });
  } catch (error) {
    console.error("Could not save state:", error.message);
    res.status(500).json({ error: "Could not save trip data." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));

app.listen(PORT, () => {
  console.log(`TripLedger is running at http://localhost:${PORT}`);
});
