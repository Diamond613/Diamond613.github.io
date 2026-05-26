/* ============================================================
   StarTech — Firebase Auth Integration (index.js replacement)
   ============================================================
   HOW TO USE:
   1. Complete the Firebase setup steps in FIREBASE_GUIDE.md
   2. Replace the firebaseConfig object below with your own
      from Firebase Console → Project Settings → Your apps
   3. Replace your existing index.js with this file
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut,
  updateProfile, sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── YOUR FIREBASE CONFIG (replace with your own) ─────────── */
const firebaseConfig = {
  apiKey: "AIzaSyCsBGJKHzfLm1qleOzjXTI7RiBv8jzNfss",
  authDomain: "startech-finance.firebaseapp.com",
  projectId: "startech-finance",
  storageBucket: "startech-finance.firebasestorage.app",
  messagingSenderId: "22974647989",
  appId: "1:22974647989:web:aed623f4f0339573b6b8fc",
  measurementId: "G-VX1SCML9N1"
};

/* ─────────────────────────────────────────────────────────── */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ============================================================
   AUTH STATE — redirect if already logged in
   ============================================================ */
onAuthStateChanged(auth, user => {
  if (user && window.location.pathname.includes("index")) {
    window.location.replace("app.html");
  }
});

/* ============================================================
   MODAL OPEN / CLOSE
   ============================================================ */
window.openModal = function (tab = "login") {
  document.getElementById("authModal").classList.add("open");
  showTab(tab);
  document.body.style.overflow = "hidden";
};

window.closeModal = function () {
  document.getElementById("authModal").classList.remove("open");
  document.body.style.overflow = "";
  hideMsg();
  hideForgot();
};

window.handleOverlayClick = function (e) {
  if (e.target === document.getElementById("authModal")) window.closeModal();
};

/* ============================================================
   TAB SWITCHING
   ============================================================ */
window.showTab = function (tab) {
  hideForgot();
  const isLogin = tab === "login";
  document.getElementById("loginForm").style.display = isLogin ? "block" : "none";
  document.getElementById("registerForm").style.display = isLogin ? "none" : "block";
  document.getElementById("tabLogin").classList.toggle("active", isLogin);
  document.getElementById("tabRegister").classList.toggle("active", !isLogin);
  hideMsg();
};

function showTab(tab) { window.showTab(tab); }

/* ============================================================
   MESSAGES
   ============================================================ */
function showMsg(msg, type) {
  const el = document.getElementById("authMsg");
  el.textContent = msg;
  el.className = "auth-msg " + type;
  el.style.display = "block";
}
function hideMsg() {
  const el = document.getElementById("authMsg");
  if (el) el.style.display = "none";
}

/* ============================================================
   PASSWORD TOGGLE + STRENGTH
   ============================================================ */
window.togglePw = function (inputId, btn) {
  const inp = document.getElementById(inputId);
  inp.type = inp.type === "password" ? "text" : "password";
  btn.textContent = inp.type === "password" ? "👁️" : "🙈";
};

window.checkStrength = function (pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  const classes = ["", "weak", "medium", "strong"];
  ["bar1", "bar2", "bar3"].forEach((id, i) => {
    document.getElementById(id).className = "pw-bar " + (score > i ? classes[score] : "");
  });
};

/* ============================================================
   REGISTER
   ============================================================ */
window.doRegister = async function () {
  hideMsg();
  const first = document.getElementById("regFirst").value.trim();
  const last = document.getElementById("regLast").value.trim();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const pw = document.getElementById("regPw").value;
  const pw2 = document.getElementById("regPw2").value;
  const secQ = document.getElementById("regSecQ").value;
  const secA = document.getElementById("regSecA").value.trim().toLowerCase();

  if (!first || !last || !email || !pw || !pw2) {
    showMsg("⚠️ Please fill in all fields.", "error"); return;
  }
  if (pw.length < 6) {
    showMsg("⚠️ Password must be at least 6 characters.", "error"); return;
  }
  if (pw !== pw2) {
    showMsg("❌ Passwords do not match.", "error"); return;
  }
  if (!secA) {
    showMsg("⚠️ Please answer your security question.", "error"); return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    const user = cred.user;

    /* Set display name */
    await updateProfile(user, { displayName: first + " " + last });

    /* Save profile to Firestore (also sets up cross-device data) */
    await setDoc(doc(db, "users", user.uid), {
      firstName: first,
      lastName: last,
      displayName: first + " " + last,
      email: email,
      securityQuestion: secQ,
      securityAnswer: secA,          /* plain text stored server-side; hash client-side if preferred */
      createdAt: serverTimestamp()
    });

    showMsg("🎉 Account created successfully!", "success");
    /* Clear form */
    ["regFirst", "regLast", "regEmail", "regPw", "regPw2", "regSecA"].forEach(id => {
      document.getElementById(id).value = "";
    });
    ["bar1", "bar2", "bar3"].forEach(id => {
      document.getElementById(id).className = "pw-bar";
    });

    /* Switch to login tab after a moment — do NOT auto-navigate */
    setTimeout(() => {
      showTab("login");
      document.getElementById("loginId").value = email;
      hideMsg();
      showMsg("✅ Account created! Enter your password to log in.", "success");
    }, 1400);

  } catch (err) {
    showMsg(firebaseError(err), "error");
  }
};

/* ============================================================
   LOGIN
   ============================================================ */
window.doLogin = async function () {
  hideMsg();
  const id = document.getElementById("loginId").value.trim().toLowerCase();
  const pw = document.getElementById("loginPw").value;
  if (!id || !pw) { showMsg("⚠️ Please fill in all fields.", "error"); return; }

  try {
    const cred = await signInWithEmailAndPassword(auth, id, pw);
    const user = cred.user;
    /* Store display name for header chip (fallback) */
    localStorage.setItem("startech_user", user.displayName || user.email);
    showMsg("✅ Welcome back, " + (user.displayName?.split(" ")[0] || "there") + "!", "success");
    setTimeout(() => { window.location.replace("app.html"); }, 700);
  } catch (err) {
    showMsg(firebaseError(err), "error");
  }
};

/* ============================================================
   FORGOT PASSWORD — Firebase sends a reset email automatically
   No need for security questions (still kept for old accounts)
   ============================================================ */
window.showForgot = function () {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("registerForm").style.display = "none";
  document.getElementById("forgotForm").style.display = "block";
  document.getElementById("tabLogin").classList.remove("active");
  document.getElementById("tabRegister").classList.remove("active");
  hideMsg();
};

window.hideForgot = function () {
  const ff = document.getElementById("forgotForm");
  if (ff) ff.style.display = "none";
};

function hideForgot() { window.hideForgot(); }

window.sendPasswordReset = async function () {
  hideMsg();
  const email = document.getElementById("fpEmail").value.trim().toLowerCase();
  if (!email) { showMsg("⚠️ Enter your email address.", "error"); return; }

  try {
    await sendPasswordResetEmail(auth, email);
    showMsg("📧 Password reset email sent! Check your inbox (and spam folder).", "success");
    setTimeout(() => {
      hideForgot();
      showTab("login");
    }, 3000);
  } catch (err) {
    showMsg(firebaseError(err), "error");
  }
};

/* ============================================================
   LOGOUT (called from app.html)
   ============================================================ */
window.doLogout = async function () {
  await signOut(auth);
  localStorage.removeItem("startech_user");
  window.location.replace("index.html");
};

/* ============================================================
   FIREBASE ERROR → human-readable message
   ============================================================ */
function firebaseError(err) {
  const map = {
    "auth/email-already-in-use": "❌ That email is already registered. Please log in instead.",
    "auth/invalid-email": "⚠️ Invalid email address.",
    "auth/weak-password": "⚠️ Password must be at least 6 characters.",
    "auth/user-not-found": "❌ No account found with that email.",
    "auth/wrong-password": "❌ Incorrect password. Please try again.",
    "auth/invalid-credential": "❌ Incorrect email or password.",
    "auth/too-many-requests": "🔒 Too many attempts. Please wait a few minutes.",
    "auth/network-request-failed": "🌐 Network error. Check your internet connection.",
    "auth/user-disabled": "🚫 This account has been disabled.",
  };
  return map[err.code] || ("❌ " + (err.message || "Something went wrong."));
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
document.addEventListener("keydown", e => {
  const modal = document.getElementById("authModal");
  if (!modal || !modal.classList.contains("open")) return;
  if (e.key === "Escape") { window.closeModal(); return; }
  if (e.key !== "Enter") return;
  const forgotVisible = document.getElementById("forgotForm")?.style.display === "block";
  if (forgotVisible) { window.sendPasswordReset(); return; }
  if (document.getElementById("loginForm").style.display !== "none") window.doLogin();
  else window.doRegister();
});
