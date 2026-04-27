/* ─────────────── 1. INITIALIZATION ─────────────── */
const _currentUser = localStorage.getItem("startech_user");
if (!_currentUser) window.location.replace("index.html");

function doLogout() {
  localStorage.removeItem("startech_user");
  window.location.replace("index.html");
}

document.addEventListener("DOMContentLoaded", () => {
  init();

  // Comma Formatting for all amount fields
  ["fAmount", "budgetInput", "eAmount"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", function () {
        const start = this.selectionStart;
        const oldLen = this.value.length;
        this.value = formatComma(this.value);
        const newLen = this.value.length;
        this.setSelectionRange(
          start + (newLen - oldLen),
          start + (newLen - oldLen),
        );
      });
    }
  });

  document.getElementById("budgetEditBtn")?.addEventListener("click", () => {
    const input = document.getElementById("budgetInput");

    if (input) {
      // If the budget is 0, clear the input so the placeholder shows.
      // Otherwise, show the formatted budget value.
      input.value =
        state.budget.monthlyLimit === 0
          ? ""
          : formatComma(state.budget.monthlyLimit.toString());
    }

    openModal("budgetModal");
  });

  document.getElementById("themeBtn")?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    save();
    applyTheme();
    updateChart();
  });
});

/* ─────────────── 2. DATA & CONFIG ─────────────── */
function userKey(base) {
  return base + "_" + _currentUser.replace(/[^a-zA-Z0-9]/g, "_");
}

const CATEGORIES = {
  income: [
    "Salary",
    "Freelance",
    "Investment",
    "Gift",
    "Refund",
    "Other Income",
  ],
  expense: [
    "Food",
    "Transport",
    "Bills",
    "Shopping",
    "Health",
    "Entertainment",
    "Education",
    "Rent",
    "Savings",
    "Other",
  ],
};

const CAT_ICONS = {
  Salary: "💼",
  Freelance: "💻",
  Investment: "📈",
  Gift: "🎁",
  Refund: "↩️",
  "Other Income": "💰",
  Food: "🍔",
  Transport: "🚗",
  Bills: "⚡",
  Shopping: "🛍️",
  Health: "💊",
  Entertainment: "🎬",
  Education: "📚",
  Rent: "🏠",
  Savings: "🏦",
  Other: "📦",
};

const CAT_COLORS = [
  "#c8f060",
  "#6bc8ff",
  "#ff6b6b",
  "#ffa94d",
  "#a78bfa",
  "#6bf0c8",
  "#f06090",
  "#60c8f0",
  "#f0c860",
  "#90f060",
  "#ff9f60",
  "#c860f0",
];

let state = {
  transactions: [],
  budget: { monthlyLimit: 0 },
  activeType: "income",
  filterCat: "All",
  editId: null,
  theme: "dark",
};

let spendingChart = null;

/* ─────────────── 3. CORE ENGINE ─────────────── */
function init() {
  load();
  applyTheme();
  setTodayDate();
  setType(state.activeType);
  buildFilterBar();
  setMonthLabel();
  setUserChip();
  updateSummary();
  updateBudget();
  renderList();

  // --- NEW: 320px SAFETY CHECK ---
  if (window.innerWidth <= 320) {
    const userEmailEl = document.getElementById("userEmail");
    if (userEmailEl) userEmailEl.style.display = "none";

    // Optional: Force the logo to be smaller if it's still pushing the width
    const logoEl = document.querySelector(".logo");
    if (logoEl) logoEl.style.fontSize = "14px";
  }
  // -------------------------------

  updateChart();

  setTimeout(() => {
    if (!spendingChart) {
      console.log("Retrying chart render...");
      updateChart();
    }
  }, 1000);
}

function load() {
  const t = localStorage.getItem(userKey("ft_transactions"));
  const b = localStorage.getItem(userKey("ft_budget"));
  const th = localStorage.getItem(userKey("ft_theme"));
  if (t) state.transactions = JSON.parse(t);
  if (b) state.budget = JSON.parse(b);
  if (th) state.theme = th;
}

function save() {
  localStorage.setItem(
    userKey("ft_transactions"),
    JSON.stringify(state.transactions),
  );
  localStorage.setItem(userKey("ft_budget"), JSON.stringify(state.budget));
  localStorage.setItem(userKey("ft_theme"), state.theme);
}

/* ─────────────── 4. ADD TRANSACTION ─────────────── */
function setType(type) {
  state.activeType = type;
  const submitBtn = document.getElementById("submitBtn");
  const sel = document.getElementById("fCategory");

  // 1. Update Dropdown Categories
  if (sel) {
    sel.innerHTML = CATEGORIES[type]
      .map((c) => `<option value="${c}">${CAT_ICONS[c]} ${c}</option>`)
      .join("");
  }

  // 2. Force the Color and Class
  if (type === "expense") {
    submitBtn.classList.add("expense-mode");
    submitBtn.textContent = "+ Add Expense";
    // Direct style backup just in case CSS fails
    submitBtn.style.backgroundColor = "var(--expense-clr)";
  } else {
    submitBtn.classList.remove("expense-mode");
    submitBtn.textContent = "+ Add Income";
    // Direct style backup
    submitBtn.style.backgroundColor = "var(--income-clr)";
  }

  // 3. Update the Tab Highlighting
  document.getElementById("btnIncome").className =
    "type-btn" + (type === "income" ? " active-income" : "");
  document.getElementById("btnExpense").className =
    "type-btn" + (type === "expense" ? " active-expense" : "");
}

/* ─────────────── ADD TRANSACTION (WITH BUDGET BLOCK) ─────────────── */
function submitTransaction() {
  const amtInput = document.getElementById("fAmount");
  const amount = parseComma(amtInput.value);
  const category = document.getElementById("fCategory").value;
  const date = document.getElementById("fDate").value;
  const note = document.getElementById("fNote").value.trim();

  if (!amount || amount <= 0) {
    showToast("⚠️ Enter valid amount");
    return;
  }

  // --- NEW: BUDGET & BALANCE LOGIC ---
  const totalIncome = state.transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = state.transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const currentBalance = totalIncome - totalExpenses;
  const budgetLimit = state.budget.monthlyLimit;

  if (state.activeType === "expense") {
    // 1. Block if Expense exceeds total net balance
    if (amount > currentBalance) {
      showToast(
        "❌ Insufficient Balance! You cannot spend more than you have.",
      );
      return;
    }

    // 2. Block if Budget Limit is reached
    if (budgetLimit > 0 && totalExpenses + amount > budgetLimit) {
      showToast(
        "🚫 Budget Limit Reached! Increase your set budget to add this expense.",
      );
      return;
    }
  }
  // ------------------------------------

  const tx = {
    id: Date.now().toString(),
    type: state.activeType,
    category,
    amount,
    date,
    description: note || category,
  };
  state.transactions.unshift(tx);

  save();
  updateAll();
  checkWarnings(
    totalExpenses + (state.activeType === "expense" ? amount : 0),
    budgetLimit,
    currentBalance - (state.activeType === "expense" ? amount : 0),
  );

  amtInput.value = "";
  document.getElementById("fNote").value = "";
  showToast(`✅ Added ${state.activeType}`);
}

/* ─────────────── 5. EDIT & DELETE (FIXED) ─────────────── */
function editTx(id) {
  const tx = state.transactions.find((t) => t.id === id.toString());
  if (!tx) return;

  state.editId = id.toString();

  // Populate the Edit Modal fields (matching your HTML IDs)
  const eCat = document.getElementById("eCat");
  if (eCat) {
    eCat.innerHTML = CATEGORIES[tx.type]
      .map((c) => `<option value="${c}">${CAT_ICONS[c]} ${c}</option>`)
      .join("");
    eCat.value = tx.category;
  }

  document.getElementById("eAmount").value = formatComma(tx.amount.toString());
  document.getElementById("eDate").value = tx.date;
  document.getElementById("eNote").value = tx.description;

  openModal("editModal");
}

function saveEdit() {
  const amount = parseComma(document.getElementById("eAmount").value);
  const category = document.getElementById("eCat").value;
  const date = document.getElementById("eDate").value;
  const note = document.getElementById("eNote").value.trim();

  if (!amount || amount <= 0) {
    showToast("⚠️ Enter valid amount");
    return;
  }

  const index = state.transactions.findIndex((t) => t.id === state.editId);
  if (index !== -1) {
    state.transactions[index] = {
      ...state.transactions[index],
      category,
      amount,
      date,
      description: note || category,
    };
    save();
    updateAll();
    closeModal();
    showToast("✅ Updated Successfully");
    state.editId = null;
  }
}

function deleteTx(id) {
  openModal("deleteModal");
  // Set the click event for the confirm button inside the modal
  document.getElementById("confirmDelBtn").onclick = () => {
    state.transactions = state.transactions.filter(
      (t) => t.id !== id.toString(),
    );
    save();
    updateAll();
    closeModal();
    showToast("🗑️ Removed");
  };
}

/* ─────────────── 6. UI & UTILS ─────────────── */
function updateAll() {
  updateSummary();
  updateBudget();
  renderList();
  updateChart();
}

function updateSummary() {
  const inc = state.transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const exp = state.transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const bal = inc - exp;

  document.getElementById("totalIncome").textContent = fmt(inc);
  document.getElementById("totalExpenses").textContent = fmt(exp);

  const balEl = document.getElementById("balance");
  const noteEl = document.getElementById("balanceNote"); // Targeting the note

  if (balEl) {
    balEl.textContent = fmt(bal);
    balEl.style.color = bal >= 0 ? "var(--accent)" : "var(--expense-clr)";
  }

  if (noteEl) {
    const lowThreshold = inc * 0.1; // 10% of total income

    if (bal <= 0) {
      noteEl.textContent = "⚠️ Critical: Zero Balance!";
      noteEl.style.color = "var(--expense-clr)";
    } else if (bal < lowThreshold) {
      noteEl.textContent = "📉 Warning: Running low on funds!";
      noteEl.style.color = "#ffa94d";
    } else {
      noteEl.textContent = "Keep it up!";
      noteEl.style.color = "var(--muted)";
    }
  }
}

function renderList() {
  const list = document.getElementById("txList");
  if (!list) return;
  let txs = [...state.transactions];
  if (state.filterCat !== "All")
    txs = txs.filter((t) => t.category === state.filterCat);

  list.innerHTML =
    txs.length === 0
      ? `<div class="empty-state">No transactions</div>`
      : txs
          .map(
            (tx) => `
    <div class="tx-item">
      <div class="tx-icon">${CAT_ICONS[tx.category] || "📦"}</div>
      <div class="tx-info">
        <div class="tx-cat">${tx.category}</div>
        <div class="tx-desc">${tx.description}</div>
      </div>
      <div class="tx-right">
        <div class="tx-date">${tx.date}</div>
        <div class="tx-amount ${tx.type}">${tx.type === "income" ? "+" : "−"}${fmt(tx.amount)}</div>
        <div class="tx-actions">
          <button class="tx-action-btn edit" onclick="editTx('${tx.id}')">✏️</button>
          <button class="tx-action-btn del" onclick="deleteTx('${tx.id}')">🗑️</button>
        </div>
      </div>
    </div>`,
          )
          .join("");
}

function updateChart() {
  const canvas = document.getElementById("spendingChart");

  // Debug Log: Check if elements exist
  if (!canvas) {
    console.error("Chart Error: Canvas element not found");
    return;
  }
  if (!window.Chart) {
    console.error("Chart Error: Chart.js library not loaded");
    return;
  }

  const exp = state.transactions.filter((t) => t.type === "expense");

  if (exp.length === 0) {
    console.log("Chart: No expenses found to display.");
    if (spendingChart) spendingChart.destroy();
    spendingChart = null;
    return;
  }

  // Force a redraw of the container dimensions
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  const catTotals = {};
  exp.forEach(
    (t) => (catTotals[t.category] = (catTotals[t.category] || 0) + t.amount),
  );

  if (spendingChart) {
    spendingChart.destroy();
  }

  const ctx = canvas.getContext("2d");

  try {
    spendingChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: Object.keys(catTotals),
        datasets: [
          {
            data: Object.values(catTotals),
            backgroundColor: CAT_COLORS,
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 }, // Slight animation to confirm it's loading
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: state.theme === "dark" ? "#eee" : "#1a1a1a",
              font: { family: "DM Sans", size: 11 },
            },
          },
        },
      },
    });
    console.log("Chart: Successfully rendered.");
  } catch (err) {
    console.error("Chart Render Crash:", err);
  }
}

function fmt(n) {
  return "₦" + Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 });
}

function formatComma(val) {
  let clean = val.toString().replace(/[^0-9.]/g, "");
  const parts = clean.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.length > 1 ? parts[0] + "." + parts[1].slice(0, 2) : parts[0];
}

function parseComma(val) {
  return parseFloat(String(val).replace(/,/g, "")) || 0;
}

function updateBudget() {
  const limit = state.budget.monthlyLimit;
  const spent = state.transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const pct = limit > 0 ? (spent / limit) * 100 : 0;

  const bar = document.getElementById("budgetBar");
  const pctEl = document.getElementById("budgetPct");

  if (bar) {
    bar.style.width = Math.min(pct, 100) + "%";
    bar.classList.remove("normal", "warning", "danger");

    if (pct >= 90) bar.classList.add("danger");
    else if (pct >= 70) bar.classList.add("warning");
    else bar.classList.add("normal");
  }

  if (pctEl) pctEl.textContent = Math.round(pct) + "%";
  document.getElementById("budgetSpent").textContent = fmt(spent) + " spent";
  document.getElementById("budgetLimit").textContent = fmt(limit) + " budget";
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  const btn = document.getElementById("themeBtn");
  if (btn) btn.textContent = state.theme === "dark" ? "☀️" : "🌙";

  // Refresh the chart so the labels change color
  if (spendingChart) {
    updateChart();
  }
}
function openModal(id) {
  document.getElementById(id).classList.add("open");
}
function closeModal() {
  document
    .querySelectorAll(".modal-overlay")
    .forEach((m) => m.classList.remove("open"));
}

function showToast(msg) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

function setTodayDate() {
  const el = document.getElementById("fDate");
  if (el) el.value = new Date().toISOString().split("T")[0];
}

function setMonthLabel() {
  const el = document.getElementById("monthLabel");
  if (el)
    el.textContent = new Date()
      .toLocaleString("default", { month: "long", year: "numeric" })
      .toUpperCase();
}

function setUserChip() {
  const email = _currentUser || "Guest";
  const local = email.split("@")[0];
  document.getElementById("userEmail").textContent =
    local.length > 12 ? local.slice(0, 12) + "..." : local;
  document.getElementById("userAvatar").textContent = email
    .charAt(0)
    .toUpperCase();
}

function buildFilterBar() {
  const bar = document.getElementById("filterBar");
  if (!bar) return;
  const allCats = ["All", ...CATEGORIES.income, ...CATEGORIES.expense];
  bar.innerHTML = allCats
    .map(
      (c) =>
        `<button class="filter-chip ${c === "All" ? "active" : ""}" onclick="setFilter('${c}', this)">${c}</button>`,
    )
    .join("");
}

function setFilter(cat, el) {
  state.filterCat = cat;
  document
    .querySelectorAll(".filter-chip")
    .forEach((btn) => btn.classList.remove("active"));
  el.classList.add("active");
  renderList();
}

function saveBudget() {
  state.budget.monthlyLimit = parseComma(
    document.getElementById("budgetInput").value,
  );
  save();
  updateBudget();
  closeModal();
  showToast("✅ Budget updated");
}

/* ─────────────── WARNING SYSTEM ─────────────── */
function checkWarnings(spent, limit, balance) {
  if (limit > 0) {
    const usage = (spent / limit) * 100;

    if (usage >= 100) {
      showToast("🚨 ALERT: You have hit 100% of your budget limit!");
    } else if (usage >= 70) {
      showToast("⚠️ Warning: You've used over 70% of your budget.");
    }
  }

  // Net Balance Warning (if balance drops below ₦5,000 or 10% of income)
  if (balance > 0 && balance < 5000) {
    showToast("📉 Low Balance: Your net balance is almost empty!");
  }
}
