// Grab the elements
const modalOverlay = document.getElementById("loginModal");
const navAuthBtn = document.getElementById("navAuthBtn");
const heroAuthBtn = document.getElementById("heroAuthBtn");

// Check if user is logged in to toggle button text
function checkAuthState() {
  const user = localStorage.getItem("startech_user");

  if (user) {
    // If logged in
    navAuthBtn.textContent = "Go to Dashboard →";
    navAuthBtn.onclick = () => (window.location.href = "app.html");

    heroAuthBtn.textContent = "Open My Dashboard →";
    heroAuthBtn.onclick = () => (window.location.href = "app.html");
  } else {
    // If logged out
    navAuthBtn.textContent = "Login";
    navAuthBtn.onclick = () => modalOverlay.classList.add("open");

    heroAuthBtn.textContent = "Get Started Free →";
    heroAuthBtn.onclick = () => modalOverlay.classList.add("open");
  }
}

// Close Modal Function
function closeModal() {
  modalOverlay.classList.remove("open");
}

// Handle Form Submission
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim().toLowerCase();
  if (!email) return;

  localStorage.setItem("startech_user", email);
  window.location.replace("app.html");
});

// Close modal on background click
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

// Run check on load
checkAuthState();
