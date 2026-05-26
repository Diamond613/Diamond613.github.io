/* ============================================================
   StarTech — app.js  (Firebase + Dashboard — fully merged)
   ============================================================
   HOW THIS FILE WORKS:
   1. Firebase checks if you are logged in.
   2. If NOT logged in → sends you back to index.html immediately.
   3. If logged in → loads your data from Firestore, then starts the app.
   4. Every time you add/edit/delete a transaction, it saves to Firestore.
   5. doLogout() signs you out of Firebase and sends you to index.html.
   ============================================================ */

/* ── Step 1: Import Firebase tools ── */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── Step 2: Your Firebase project config ──
   Get these values from:
   Firebase Console → Project Settings → Your apps → SDK setup
   Replace every "YOUR_..." with your real values.             */
const firebaseConfig = {
  apiKey: "AIzaSyCsBGJKHzfLm1qleOzjXTI7RiBv8jzNfss",
  authDomain: "startech-finance.firebaseapp.com",
  projectId: "startech-finance",
  storageBucket: "startech-finance.firebasestorage.app",
  messagingSenderId: "22974647989",
  appId: "1:22974647989:web:aed623f4f0339573b6b8fc",
  measurementId: "G-VX1SCML9N1"
};

/* ── Step 3: Start Firebase ── */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* This holds the currently logged-in Firebase user */
let currentFirebaseUser = null;

/* ============================================================
   AUTH GUARD
   Firebase automatically checks if someone is logged in.
   - Not logged in  → redirect to index.html (login page)
   - Logged in      → load their Firestore data, then start app
   ============================================================ */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    /* Nobody is logged in — go back to login page */
    window.location.replace("index.html");
    return;
  }

  /* User IS logged in */
  currentFirebaseUser = user;

  /* Save their display name so the header chip can show it */
  localStorage.setItem("startech_user", user.displayName || user.email);

  /* Load this user's transactions and settings from Firestore */
  await loadFromFirestore(user.uid);

  /* Now start the dashboard */
  init();
});

/* ============================================================
   FIRESTORE — LOAD USER DATA
   Reads the user's document from the "userData" collection.
   If the user is brand new, the document won't exist yet —
   that's fine, they just start with an empty state.
   ============================================================ */
async function loadFromFirestore(uid) {
  try {
    const snap = await getDoc(doc(db, "userData", uid));
    if (snap.exists()) {
      const data = snap.data();
      state.transactions = data.transactions || [];
      state.budget = data.budget || { monthlyLimit: 0 };
      state.theme = data.theme || "dark";
    }
    /* If no document exists yet, state keeps its default empty values */
  } catch (err) {
    console.error("Could not load data from Firestore:", err);
    /* App still works — user just starts with empty data */
  }
}

/* ============================================================
   FIRESTORE — SAVE USER DATA
   Writes the entire state to Firestore every time something
   changes (add, edit, delete transaction, change budget, etc.)
   ============================================================ */
async function saveToFirestore() {
  if (!currentFirebaseUser) return;
  try {
    await setDoc(doc(db, "userData", currentFirebaseUser.uid), {
      transactions: state.transactions,
      budget: state.budget,
      theme: state.theme
    });
  } catch (err) {
    console.error("Could not save to Firestore:", err);
    showToast("⚠️ Could not sync to cloud. Check your connection.");
  }
}

/* ============================================================
   LOGOUT
   Signs the user out of Firebase, clears local storage,
   and sends them back to the login page.
   ============================================================ */
window.doLogout = async function () {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Logout error:", err);
  }
  localStorage.removeItem("startech_user");
  window.location.replace("index.html");
};

/* ============================================================
   GLOBAL STATE
   All your app data lives here while the page is open.
   ============================================================ */
let state = {
  transactions: [],
  budget: { monthlyLimit: 0 },
  activeType: "income",
  filterCat: "All",
  editId: null,
  theme: "dark",
};

/* ============================================================
   CATEGORIES & ICONS
   ============================================================ */
const CATEGORIES = {
  income: ["Salary", "Freelance", "Investment", "Gift", "Refund", "Other Income"],
  expense: ["Food", "Transport", "Bills", "Shopping", "Health", "Entertainment",
    "Education", "Rent", "Savings", "Other"]
};

const CAT_ICONS = {
  Salary: "💼", Freelance: "💻", Investment: "📈", Gift: "🎁", Refund: "↩️", "Other Income": "💰",
  Food: "🍔", Transport: "🚗", Bills: "⚡", Shopping: "🛍️", Health: "💊", Entertainment: "🎬",
  Education: "📚", Rent: "🏠", Savings: "🏦", Other: "📦"
};

const CAT_COLORS = [
  "#c8f060", "#6bc8ff", "#ff6b6b", "#ffa94d", "#a78bfa",
  "#6bf0c8", "#f06090", "#60c8f0", "#f0c860", "#90f060"
];

/* ============================================================
   UTILITIES
   ============================================================ */

/* Format a number as ₦1,234.56 */
function fmt(n) {
  return "₦" + Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 });
}

/* Format an input field value with commas while typing */
function formatComma(val) {
  let clean = String(val).replace(/[^0-9.]/g, "");
  const dotIndex = clean.indexOf(".");
  if (dotIndex !== -1) {
    clean = clean.slice(0, dotIndex + 1) +
      clean.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
  }
  const parts = clean.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.length > 1 ? parts[0] + "." + parts[1] : parts[0];
}

/* Parse a comma-formatted string back to a number */
function parseComma(val) {
  return parseFloat(String(val).replace(/,/g, "")) || 0;
}

/* ============================================================
   DATE HELPERS
   ============================================================ */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* A transaction is "active" (counted in totals) if its date is today or in the past */
function isActive(tx) {
  return tx.date <= todayStr();
}

/* ============================================================
   SAVE  (replaces old localStorage-only save)
   Saves to BOTH localStorage (for instant UI) AND Firestore (cloud sync).
   ============================================================ */
function save() {
  /* Keep a local copy so the UI never feels slow */
  if (currentFirebaseUser) {
    const uid = currentFirebaseUser.uid;
    localStorage.setItem("ft_tx_" + uid, JSON.stringify(state.transactions));
    localStorage.setItem("ft_budget_" + uid, JSON.stringify(state.budget));
    localStorage.setItem("ft_theme_" + uid, state.theme);
  }
  /* Sync to Firestore in the background (non-blocking) */
  saveToFirestore();
}

/* ============================================================
   APP INIT — called after Firestore data is loaded
   ============================================================ */
function init() {
  applyTheme();
  setTodayDate();
  setType(state.activeType);
  buildFilterBar();
  setMonthLabel();
  setUserChip();
  updateSummary();
  updateBudget();
  renderList();
  updateChart();
  attachAmountListeners();
  attachButtonListeners();
}

/* ============================================================
   AMOUNT INPUT — live comma formatting
   ============================================================ */
function attachAmountListeners() {
  ["fAmount", "budgetInput", "eAmount"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function () {
      const cur = this.selectionStart;
      const old = this.value.length;
      this.value = formatComma(this.value);
      const delta = this.value.length - old;
      this.setSelectionRange(cur + delta, cur + delta);
    });
  });
}

/* ============================================================
   BUTTON LISTENERS
   ============================================================ */
function attachButtonListeners() {
  document.getElementById("budgetEditBtn")?.addEventListener("click", () => {
    const input = document.getElementById("budgetInput");
    if (input) {
      input.value = state.budget.monthlyLimit > 0
        ? formatComma(String(state.budget.monthlyLimit))
        : "";
    }
    openModal("budgetModal");
  });

  document.getElementById("themeBtn")?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    save();
    applyTheme();
    updateChart();
  });

  document.getElementById("logoutBtn")?.addEventListener("click", doLogout);
  document.getElementById("submitBtn")?.addEventListener("click", submitTransaction);
  document.getElementById("btnIncome")?.addEventListener("click", () => setType("income"));
  document.getElementById("btnExpense")?.addEventListener("click", () => setType("expense"));

  document.getElementById("balanceEmptyClose")?.addEventListener("click", closeBalanceModal);
  document.getElementById("balanceEmptyAddIncome")?.addEventListener("click", () => {
    closeBalanceModal();
    setType("income");
    document.getElementById("fAmount")?.focus();
  });
}

/* ============================================================
   TYPE SWITCHER (Income / Expense)
   ============================================================ */
function setType(type) {
  state.activeType = type;

  const sel = document.getElementById("fCategory");
  if (sel) {
    sel.innerHTML = CATEGORIES[type]
      .map(c => `<option value="${c}">${CAT_ICONS[c]} ${c}</option>`)
      .join("");
  }

  const btn = document.getElementById("submitBtn");
  if (btn) {
    btn.classList.toggle("expense-mode", type === "expense");
    btn.textContent = type === "expense" ? "+ Add Expense" : "+ Add Income";
  }

  document.getElementById("btnIncome").className =
    "type-btn" + (type === "income" ? " active-income" : "");
  document.getElementById("btnExpense").className =
    "type-btn" + (type === "expense" ? " active-expense" : "");
}

/* ============================================================
   ADD TRANSACTION
   ============================================================ */
function submitTransaction() {
  const amtInput = document.getElementById("fAmount");
  const amount = parseComma(amtInput.value);
  const category = document.getElementById("fCategory").value;
  const date = document.getElementById("fDate").value;
  const note = document.getElementById("fNote").value.trim();

  if (!amount || amount <= 0) { showToast("⚠️ Enter a valid amount"); return; }
  if (!date) { showToast("⚠️ Please pick a date"); return; }

  /* Budget guard — only for active (today or past) expenses */
  if (state.activeType === "expense" && date <= todayStr()) {
    const limit = state.budget.monthlyLimit;
    if (limit > 0) {
      const spent = state.transactions
        .filter(t => t.type === "expense" && isActive(t))
        .reduce((s, t) => s + t.amount, 0);
      const newSpent = spent + amount;
      const pct = (newSpent / limit) * 100;
      if (pct > 100) {
        showToast("🚫 Budget exceeded! Increase your budget first.");
        return;
      }
      if (pct >= 90) showToast("🔴 Warning: This takes you to " + Math.round(pct) + "% of your budget!");
      else if (pct >= 70) showToast("🟡 Heads-up: You've used " + Math.round(pct) + "% of your budget.");
    }
  }

  state.transactions.unshift({
    id: Date.now().toString(),
    type: state.activeType,
    category,
    amount,
    date,
    description: note || category
  });

  save();
  updateAll();
  showToast(`✅ ${state.activeType === "income" ? "Income" : "Expense"} added!`);
  amtInput.value = "";
  document.getElementById("fNote").value = "";
  setTodayDate();
}

/* ============================================================
   EDIT TRANSACTION
   ============================================================ */
window.editTx = function (id) {
  const tx = state.transactions.find(t => t.id === String(id));
  if (!tx) return;
  state.editId = String(id);

  const eCat = document.getElementById("eCat");
  if (eCat) {
    eCat.innerHTML = CATEGORIES[tx.type]
      .map(c => `<option value="${c}">${CAT_ICONS[c]} ${c}</option>`)
      .join("");
    eCat.value = tx.category;
  }
  document.getElementById("eAmount").value = formatComma(String(tx.amount));
  document.getElementById("eDate").value = tx.date;
  document.getElementById("eNote").value = tx.description;
  openModal("editModal");
};

window.saveEdit = function () {
  const amount = parseComma(document.getElementById("eAmount").value);
  const category = document.getElementById("eCat").value;
  const date = document.getElementById("eDate").value;
  const note = document.getElementById("eNote").value.trim();

  if (!amount || amount <= 0) { showToast("⚠️ Enter a valid amount"); return; }

  const i = state.transactions.findIndex(t => t.id === state.editId);
  if (i !== -1) {
    state.transactions[i] = {
      ...state.transactions[i],
      category,
      amount,
      date,
      description: note || category
    };
    save();
    updateAll();
    closeModal();
    showToast("✅ Transaction updated");
    state.editId = null;
  }
};

/* ============================================================
   DELETE TRANSACTION
   ============================================================ */
window.deleteTx = function (id) {
  openModal("deleteModal");
  document.getElementById("confirmDelBtn").onclick = () => {
    state.transactions = state.transactions.filter(t => t.id !== String(id));
    save();
    updateAll();
    closeModal();
    showToast("🗑️ Transaction removed");
  };
};

/* ============================================================
   UPDATE ALL (called after any data change)
   ============================================================ */
function updateAll() {
  updateSummary();
  updateBudget();
  renderList();
  updateChart();
}

/* ============================================================
   SUMMARY CARDS + BALANCE WARNINGS
   ============================================================ */
function updateSummary() {
  const activeTx = state.transactions.filter(isActive);
  const inc = activeTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const exp = activeTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const bal = inc - exp;

  const incCount = activeTx.filter(t => t.type === "income").length;
  const expCount = activeTx.filter(t => t.type === "expense").length;

  document.getElementById("totalIncome").textContent = fmt(inc);
  document.getElementById("totalExpenses").textContent = fmt(exp);

  const icEl = document.getElementById("incomeCount");
  if (icEl) icEl.textContent = `${incCount} transaction${incCount !== 1 ? "s" : ""}`;
  const ecEl = document.getElementById("expenseCount");
  if (ecEl) ecEl.textContent = `${expCount} transaction${expCount !== 1 ? "s" : ""}`;

  const balEl = document.getElementById("balance");
  const noteEl = document.getElementById("balanceNote");
  if (balEl) {
    balEl.textContent = fmt(bal);
    balEl.style.color = bal >= 0 ? "var(--income-clr)" : "var(--expense-clr)";
  }
  if (noteEl) {
    if (bal > 0) { noteEl.textContent = "Great job! 🎉"; noteEl.style.color = "var(--income-clr)"; }
    else if (bal < 0) { noteEl.textContent = "Overspent ⚠️"; noteEl.style.color = "var(--expense-clr)"; }
    else { noteEl.textContent = "Break even"; noteEl.style.color = "var(--muted)"; }
  }

  /* Spending warnings */
  if (inc > 0) {
    const usedPct = (exp / inc) * 100;
    if (bal <= 0 && exp > 0) {
      hideBalanceBanner();
      openBalanceModal();
    } else if (usedPct >= 70) {
      showBalanceBanner(usedPct);
    } else {
      hideBalanceBanner();
    }
  } else {
    hideBalanceBanner();
  }
}

/* 70–99% spending banner */
function showBalanceBanner(pct) {
  let b = document.getElementById("balanceBanner");
  if (!b) {
    b = document.createElement("div");
    b.id = "balanceBanner";
    const grid = document.querySelector(".summary-grid");
    grid?.parentNode?.insertBefore(b, grid.nextSibling);
  }
  const danger = pct >= 90;
  b.className = `balance-banner ${danger ? "danger" : "warning"}`;
  b.innerHTML = `
    <span class="bb-icon">${danger ? "🔴" : "🟡"}</span>
    <div class="bb-text">
      ${danger
      ? `<strong>Almost out of money!</strong> You've spent <strong>${Math.round(pct)}%</strong> of your total income.`
      : `<strong>Spending alert:</strong> You've used <strong>${Math.round(pct)}%</strong> of your income.`}
    </div>
    <button class="bb-close" onclick="hideBalanceBanner()" title="Dismiss">✕</button>`;
}

window.hideBalanceBanner = function () {
  document.getElementById("balanceBanner")?.remove();
};

/* 100% balance popup */
function openBalanceModal() {
  if (sessionStorage.getItem("balModalShown")) return;
  sessionStorage.setItem("balModalShown", "1");
  document.getElementById("balanceEmptyModal")?.classList.add("open");
}

function closeBalanceModal() {
  document.getElementById("balanceEmptyModal")?.classList.remove("open");
}

/* ============================================================
   BUDGET
   ============================================================ */
function updateBudget() {
  const limit = state.budget.monthlyLimit;
  const spent = state.transactions
    .filter(t => t.type === "expense" && isActive(t))
    .reduce((s, t) => s + t.amount, 0);
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;

  const bar = document.getElementById("budgetBar");
  if (bar) {
    bar.style.width = pct + "%";
    bar.className = "budget-bar-fill " + (pct >= 90 ? "danger" : pct >= 70 ? "warning" : "normal");
  }
  const se = document.getElementById("budgetSpent"); if (se) se.textContent = fmt(spent) + " spent";
  const le = document.getElementById("budgetLimit"); if (le) le.textContent = (limit > 0 ? fmt(limit) : "₦0.00") + " budget";
  const pe = document.getElementById("budgetPct"); if (pe) pe.textContent = Math.round(pct) + "%";
}

window.saveBudget = function () {
  const amount = parseComma(document.getElementById("budgetInput").value);
  if (!amount || amount <= 0) { showToast("⚠️ Enter a valid budget amount"); return; }
  state.budget.monthlyLimit = amount;
  save();
  updateBudget();
  closeModal();
  showToast("✅ Budget set to " + fmt(amount));
  sessionStorage.removeItem("balModalShown");
  updateSummary();
};

/* ============================================================
   TRANSACTION LIST
   ============================================================ */
function renderList() {
  const list = document.getElementById("txList");
  if (!list) return;

  const today = todayStr();
  const txs = state.filterCat === "All"
    ? [...state.transactions]
    : state.transactions.filter(t => t.category === state.filterCat);

  if (txs.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💸</div>
        <p>No transactions yet. Add one!</p>
      </div>`;
    return;
  }

  list.innerHTML = txs.map(tx => {
    const pending = tx.date > today;
    const badge = pending ? `<span class="pending-badge">PENDING</span>` : "";
    return `
      <div class="tx-item${pending ? " tx-pending" : ""}">
        <div class="tx-icon" style="background:${tx.type === "income"
        ? "rgba(6,206,46,0.12)"
        : "rgba(250,16,16,0.12)"}">
          ${CAT_ICONS[tx.category] || "📦"}
        </div>
        <div class="tx-info">
          <div class="tx-cat">${tx.category}${badge}</div>
          <div class="tx-desc">${tx.description}</div>
        </div>
        <div class="tx-right">
          <div class="tx-date">${formatDate(tx.date)}</div>
          <div class="tx-amount ${tx.type}">
            ${tx.type === "income" ? "+" : "−"}${fmt(tx.amount)}
          </div>
          <div class="tx-actions">
            <button class="tx-action-btn edit" onclick="editTx('${tx.id}')"   title="Edit">✏️</button>
            <button class="tx-action-btn del"  onclick="deleteTx('${tx.id}')" title="Delete">🗑️</button>
          </div>
        </div>
      </div>`;
  }).join("");
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00")
    .toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

/* ============================================================
   CHART
   ============================================================ */
function updateChart() {
  const canvas = document.getElementById("spendingChart");
  if (!canvas || !window.Chart) return;

  if (window.spendingChartInstance) {
    window.spendingChartInstance.destroy();
    window.spendingChartInstance = null;
  }

  const expTx = state.transactions.filter(t => t.type === "expense" && isActive(t));
  if (expTx.length === 0) {
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const catTotals = {};
  expTx.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });

  const dk = state.theme === "dark";
  const lc = dk ? "#f0eee8" : "#374151";

  window.spendingChartInstance = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: Object.keys(catTotals),
      datasets: [{
        data: Object.values(catTotals),
        backgroundColor: CAT_COLORS,
        borderWidth: 2,
        borderColor: dk ? "#1a1a24" : "#ffffff",
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "62%",
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: lc, font: { size: 11, family: "'DM Mono',monospace" },
            usePointStyle: true, padding: 12, boxWidth: 10, boxHeight: 10,
            generateLabels(chart) {
              return chart.data.labels.map((label, i) => ({
                text: `${label}  ${fmt(chart.data.datasets[0].data[i])}`,
                fillStyle: chart.data.datasets[0].backgroundColor[i],
                strokeStyle: chart.data.datasets[0].backgroundColor[i],
                fontColor: lc, hidden: false, index: i
              }));
            }
          }
        },
        tooltip: {
          backgroundColor: dk ? "#1a1a24" : "#fff",
          titleColor: dk ? "#f0eee8" : "#111827",
          bodyColor: dk ? "#c0bfcf" : "#374151",
          borderColor: dk ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
          borderWidth: 1,
          callbacks: { label: ctx => ` ${fmt(ctx.parsed)}` }
        }
      }
    }
  });
}

/* ============================================================
   THEME
   ============================================================ */
function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  document.body.setAttribute("data-theme", state.theme);
  const btn = document.getElementById("themeBtn");
  if (btn) btn.textContent = state.theme === "dark" ? "☀️" : "🌙";
}

/* ============================================================
   MODALS
   ============================================================ */
window.openModal = function (id) { document.getElementById(id)?.classList.add("open"); };
window.closeModal = function () {
  document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("open"));
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => { if (e.target === overlay) window.closeModal(); });
  });
});

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function showToast(msg) {
  const c = document.getElementById("toastContainer");
  if (!c) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

/* ============================================================
   FILTER BAR
   ============================================================ */
function buildFilterBar() {
  const bar = document.getElementById("filterBar");
  if (!bar) return;
  const allCats = ["All", ...CATEGORIES.income, ...CATEGORIES.expense];
  bar.innerHTML = allCats.map(c => `
    <button class="filter-chip${c === state.filterCat ? " active" : ""}"
            onclick="setFilter('${c}', this)">
      ${c === "All" ? "All" : (CAT_ICONS[c] ? CAT_ICONS[c] + " " : "") + c}
    </button>`).join("");
}

window.setFilter = function (cat, el) {
  state.filterCat = cat;
  document.querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  renderList();
};

/* ============================================================
   HELPERS
   ============================================================ */
function setTodayDate() {
  const el = document.getElementById("fDate");
  if (el) el.value = todayStr();
}

function setMonthLabel() {
  const el = document.getElementById("monthLabel");
  if (el) {
    el.textContent = new Date()
      .toLocaleString("default", { month: "long", year: "numeric" })
      .toUpperCase();
  }
}

function setUserChip() {
  const user = currentFirebaseUser;
  if (!user) return;

  /* Use Firebase display name if available, otherwise use email */
  const displayName = user.displayName || user.email || "User";
  const firstName = displayName.split(" ")[0];

  const av = document.getElementById("userAvatar");
  if (av) av.textContent = firstName.charAt(0).toUpperCase();

  const em = document.getElementById("userEmail");
  if (em) em.textContent = firstName;
}
