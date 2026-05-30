/* ============================================================
   StarTech — app.js  (Firebase + Dashboard)
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCsBGJKHzfLm1qleOzjXTI7RiBv8jzNfss",
  authDomain: "startech-finance.firebaseapp.com",
  projectId: "startech-finance",
  storageBucket: "startech-finance.firebasestorage.app",
  messagingSenderId: "22974647989",
  appId: "1:22974647989:web:aed623f4f0339573b6b8fc",
  measurementId: "G-VX1SCML9N1"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

let currentFirebaseUser = null;

/* ============================================================
   AUTH GUARD
   ============================================================ */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("index.html");
    return;
  }
  currentFirebaseUser = user;
  localStorage.setItem("startech_user", user.displayName || user.email);
  await loadFromFirestore(user.uid);
  init();
});

/* ============================================================
   FIRESTORE — LOAD
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
  } catch (err) {
    console.error("Could not load data from Firestore:", err);
  }
}

/* ============================================================
   FIRESTORE — SAVE
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
    showToast("Could not sync to cloud. Check your connection.", "warning");
  }
}

/* ============================================================
   LOGOUT
   ============================================================ */
window.doLogout = async function () {
  try { await signOut(auth); } catch (err) { console.error("Logout error:", err); }
  localStorage.removeItem("startech_user");
  window.location.replace("index.html");
};

/* ============================================================
   GLOBAL STATE
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
function fmt(n) {
  return "₦" + Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 });
}

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

function parseComma(val) {
  return parseFloat(String(val).replace(/,/g, "")) || 0;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isActive(tx) {
  return tx.date <= todayStr();
}

/* ============================================================
   SAVE
   ============================================================ */
function save() {
  if (currentFirebaseUser) {
    const uid = currentFirebaseUser.uid;
    localStorage.setItem("ft_tx_" + uid, JSON.stringify(state.transactions));
    localStorage.setItem("ft_budget_" + uid, JSON.stringify(state.budget));
    localStorage.setItem("ft_theme_" + uid, state.theme);
  }
  saveToFirestore();
}

/* ============================================================
   INJECT MODERN WARNING STYLES
   ============================================================ */
function injectWarningStyles() {
  if (document.getElementById("startech-warning-styles")) return;
  const style = document.createElement("style");
  style.id = "startech-warning-styles";
  style.textContent = `
    /* Toast upgrades */
    .toast {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      border-radius: 14px !important;
      padding: 13px 18px !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2) !important;
      backdrop-filter: blur(12px) !important;
      border-left-width: 4px !important;
    }
    .toast.toast-success { border-left-color: #06ce2e !important; }
    .toast.toast-warning { border-left-color: #ffa94d !important; }
    .toast.toast-danger  { border-left-color: #fa1010 !important; }
    .toast.toast-info    { border-left-color: #6bc8ff !important; }
    .toast-icon { font-size: 18px; flex-shrink: 0; line-height: 1; }
    .toast-text { flex: 1; line-height: 1.4; }

    /* No-income warning banner */
    #noIncomeBanner {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      background: linear-gradient(135deg, rgba(255,169,77,0.12), rgba(255,169,77,0.05));
      border: 1px solid rgba(255,169,77,0.35);
      border-left: 4px solid #ffa94d;
      border-radius: 14px;
      padding: 16px 18px;
      margin-bottom: 20px;
      animation: bannerSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
    }
    #noIncomeBanner .nb-icon { font-size: 24px; flex-shrink: 0; margin-top: 1px; }
    #noIncomeBanner .nb-body { flex: 1; }
    #noIncomeBanner .nb-title {
      font-family: 'Syne', sans-serif;
      font-weight: 700;
      font-size: 14px;
      color: #ffa94d;
      margin-bottom: 4px;
    }
    #noIncomeBanner .nb-text {
      font-size: 13px;
      color: var(--muted);
      line-height: 1.55;
    }
    #noIncomeBanner .nb-add-btn {
      display: inline-block;
      margin-top: 10px;
      padding: 7px 16px;
      background: rgba(255,169,77,0.15);
      border: 1px solid rgba(255,169,77,0.4);
      border-radius: 8px;
      color: #ffa94d;
      font-family: 'DM Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 0.04em;
      transition: background 0.2s, transform 0.15s;
    }
    #noIncomeBanner .nb-add-btn:hover {
      background: rgba(255,169,77,0.28);
      transform: translateY(-1px);
    }
    #noIncomeBanner .nb-close {
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 16px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 6px;
      line-height: 1;
      flex-shrink: 0;
      margin-top: 1px;
      transition: color 0.2s, background 0.2s;
    }
    #noIncomeBanner .nb-close:hover { color: var(--text); background: var(--bg2); }

    /* Balance banner upgrades */
    .balance-banner {
      border-left-width: 4px !important;
      border-radius: 14px !important;
      animation: bannerSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1) !important;
      position: relative;
      overflow: hidden;
    }
    .balance-banner::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent 60%, rgba(255,255,255,0.025));
      pointer-events: none;
    }
    .balance-banner.warning { border-left-color: #ffa94d !important; }
    .balance-banner.danger  { border-left-color: #fa1010 !important; }

    /* Balance empty modal glow */
    #balanceEmptyModal .modal {
      position: relative;
      overflow: hidden;
    }
    #balanceEmptyModal .modal::before {
      content: '';
      position: absolute;
      top: -80px; left: 50%;
      transform: translateX(-50%);
      width: 240px; height: 240px;
      background: radial-gradient(circle, rgba(250,16,16,0.1), transparent 70%);
      pointer-events: none;
    }
    .modal-alert-icon {
      position: relative;
      z-index: 1;
      display: inline-block;
      animation: iconBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) both,
                 iconPulse 2.5s ease-in-out 0.5s infinite !important;
    }
    @keyframes iconBounce {
      from { transform: scale(0.4); opacity: 0; }
      to   { transform: scale(1);   opacity: 1; }
    }
    @keyframes iconPulse {
      0%, 100% { transform: scale(1) rotate(0deg); }
      50%      { transform: scale(1.07) rotate(-3deg); }
    }

    /* Budget bar pulse when danger */
    .budget-bar-fill.danger {
      animation: budgetPulse 1.6s ease-in-out infinite;
    }
    @keyframes budgetPulse {
      0%, 100% { opacity: 1; box-shadow: none; }
      50% { opacity: 0.75; box-shadow: 0 0 12px rgba(250,16,16,0.4); }
    }

    /* Shared slide-in */
    @keyframes bannerSlideIn {
      from { opacity: 0; transform: translateY(-12px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Button shake on validation error */
    @keyframes btnShake {
      0%, 100% { transform: translateX(0); }
      20%      { transform: translateX(-7px); }
      40%      { transform: translateX(7px); }
      60%      { transform: translateX(-4px); }
      80%      { transform: translateX(4px); }
    }
    .btn-shake { animation: btnShake 0.4s ease !important; }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   APP INIT
   ============================================================ */
function init() {
  injectWarningStyles();
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
   AMOUNT INPUT
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
   TYPE SWITCHER — warns on expense if no income recorded
   ============================================================ */
function setType(type) {
  state.activeType = type;

  if (type === "expense") {
    const totalIncome = state.transactions
      .filter(t => t.type === "income" && isActive(t))
      .reduce((s, t) => s + t.amount, 0);
    if (totalIncome === 0) {
      showNoIncomeBanner();
    } else {
      hideNoIncomeBanner();
    }
  } else {
    hideNoIncomeBanner();
  }

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
   NO-INCOME BANNER
   ============================================================ */
function showNoIncomeBanner() {
  if (document.getElementById("noIncomeBanner")) return;
  const banner = document.createElement("div");
  banner.id = "noIncomeBanner";
  banner.innerHTML = `
    <span class="nb-icon">⚠️</span>
    <div class="nb-body">
      <div class="nb-title">No Income Recorded Yet</div>
      <div class="nb-text">
        You have no income added. Record your income first so your balance
        stays accurate and expenses are tracked correctly.
      </div>
      <button class="nb-add-btn" id="noIncomeAddBtn">+ Add Income First</button>
    </div>
    <button class="nb-close" id="noIncomeDismiss" title="Dismiss">✕</button>
  `;
  const grid = document.querySelector(".main-grid");
  grid?.parentNode?.insertBefore(banner, grid);

  document.getElementById("noIncomeAddBtn")?.addEventListener("click", () => {
    hideNoIncomeBanner();
    setType("income");
    document.getElementById("fAmount")?.focus();
  });
  document.getElementById("noIncomeDismiss")?.addEventListener("click", hideNoIncomeBanner);
}

function hideNoIncomeBanner() {
  const b = document.getElementById("noIncomeBanner");
  if (!b) return;
  b.style.transition = "opacity 0.25s ease, transform 0.25s ease";
  b.style.opacity = "0";
  b.style.transform = "translateY(-10px)";
  setTimeout(() => b.remove(), 270);
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

  if (!amount || amount <= 0) {
    shakeBtn("submitBtn");
    showToast("Enter a valid amount", "warning");
    return;
  }
  if (!date) {
    shakeBtn("submitBtn");
    showToast("Please pick a date", "warning");
    return;
  }

  /* Block expense submission if no income exists */
  if (state.activeType === "expense") {
    const totalIncome = state.transactions
      .filter(t => t.type === "income" && isActive(t))
      .reduce((s, t) => s + t.amount, 0);

    if (totalIncome === 0) {
      shakeBtn("submitBtn");
      showToast("Add some income before recording expenses", "danger");
      showNoIncomeBanner();
      return;
    }

    /* Budget guard */
    if (date <= todayStr()) {
      const limit = state.budget.monthlyLimit;
      if (limit > 0) {
        const spent = state.transactions
          .filter(t => t.type === "expense" && isActive(t))
          .reduce((s, t) => s + t.amount, 0);
        const newSpent = spent + amount;
        const pct = (newSpent / limit) * 100;
        if (pct > 100) {
          shakeBtn("submitBtn");
          showToast("Budget exceeded! Increase your budget first.", "danger");
          return;
        }
        if (pct >= 90) showToast(`This takes you to ${Math.round(pct)}% of your budget!`, "danger");
        else if (pct >= 70) showToast(`You've used ${Math.round(pct)}% of your budget.`, "warning");
      }
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
  showToast(`${state.activeType === "income" ? "Income" : "Expense"} added successfully!`, "success");
  amtInput.value = "";
  document.getElementById("fNote").value = "";
  setTodayDate();

  if (state.activeType === "income") hideNoIncomeBanner();
}

/* ============================================================
   SHAKE BUTTON HELPER
   ============================================================ */
function shakeBtn(id) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.classList.remove("btn-shake");
  void btn.offsetWidth;
  btn.classList.add("btn-shake");
  setTimeout(() => btn.classList.remove("btn-shake"), 500);
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

  if (!amount || amount <= 0) { showToast("Enter a valid amount", "warning"); return; }

  const i = state.transactions.findIndex(t => t.id === state.editId);
  if (i !== -1) {
    state.transactions[i] = {
      ...state.transactions[i],
      category, amount, date,
      description: note || category
    };
    save();
    updateAll();
    closeModal();
    showToast("Transaction updated", "success");
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
    showToast("Transaction removed", "info");
  };
};

/* ============================================================
   UPDATE ALL
   ============================================================ */
function updateAll() {
  updateSummary();
  updateBudget();
  renderList();
  updateChart();
}

/* ============================================================
   SUMMARY CARDS + BALANCE WARNINGS
   All warnings show every time — no session lock
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

  /* Warnings — no sessionStorage gate, fires every time */
  if (inc > 0) {
    const usedPct = exp > 0 ? (exp / inc) * 100 : 0;
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

/* ============================================================
   BALANCE BANNER (70%+ spending of income)
   ============================================================ */
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
      ? `<strong>Almost out of money!</strong> You've spent <strong>${Math.round(pct)}%</strong> of your total income. Consider cutting back.`
      : `<strong>Spending alert:</strong> You've used <strong>${Math.round(pct)}%</strong> of your income. Watch your spending.`
    }
    </div>
    <button class="bb-close" onclick="hideBalanceBanner()" title="Dismiss">✕</button>`;
}

window.hideBalanceBanner = function () {
  const b = document.getElementById("balanceBanner");
  if (!b) return;
  b.style.transition = "opacity 0.25s ease, transform 0.25s ease";
  b.style.opacity = "0";
  b.style.transform = "translateY(-10px)";
  setTimeout(() => b.remove(), 270);
};

/* ============================================================
   BALANCE EMPTY MODAL — fires every time balance hits zero
   (sessionStorage.getItem lock removed entirely)
   ============================================================ */
function openBalanceModal() {
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
  if (!amount || amount <= 0) { showToast("Enter a valid budget amount", "warning"); return; }
  state.budget.monthlyLimit = amount;
  save();
  updateBudget();
  closeModal();
  showToast("Budget set to " + fmt(amount), "success");
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
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "65%",
      animation: { animateRotate: true, duration: 700, easing: "easeInOutQuart" },
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
          borderWidth: 1, padding: 12, cornerRadius: 10,
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
   TOAST — typed with icon, auto-strips emoji prefixes
   ============================================================ */
function showToast(msg, type = "info") {
  const c = document.getElementById("toastContainer");
  if (!c) return;
  const icons = { success: "✅", warning: "⚠️", danger: "🚫", info: "ℹ️" };
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.innerHTML = `
    <span class="toast-icon">${icons[type] || "ℹ️"}</span>
    <span class="toast-text">${msg}</span>
  `;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(() => t.remove(), 300);
  }, 3000);
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
  const displayName = user.displayName || user.email || "User";
  const firstName = displayName.split(" ")[0];
  const av = document.getElementById("userAvatar");
  if (av) av.textContent = firstName.charAt(0).toUpperCase();
  const em = document.getElementById("userEmail");
  if (em) em.textContent = firstName;
}
