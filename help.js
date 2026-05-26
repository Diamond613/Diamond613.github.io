const searchInput = document.getElementById("helpSearch");
const sections = document.querySelectorAll(".guide-section");
const noResults = document.getElementById("noResults");

searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase().trim();
  let hasMatches = false;

  sections.forEach((section) => {
    const keywords = section.getAttribute("data-keywords");
    const content = section.innerText.toLowerCase();

    if (content.includes(term) || keywords.includes(term)) {
      section.classList.remove("hidden");
      hasMatches = true;
    } else {
      section.classList.add("hidden");
    }
  });

  noResults.style.display = hasMatches ? "none" : "block";
});

// Modal Controls
const modal = document.getElementById('loginModal');
const loginBtns = document.querySelectorAll('#navAuthBtn, #heroAuthBtn');

let isLoginMode = true;

// Open Modal
loginBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    modal.classList.add('open');
    resetToLogin();
  });
});

function closeModal() {
  modal.classList.remove('open');
}

// Toggle between Login and Sign Up
document.getElementById('switchMode').addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  updateModalMode();
});

function updateModalMode() {
  const title = document.getElementById('modalTitle');
  const subtitle = document.getElementById('modalSubtitle');
  const submitBtn = document.getElementById('submitBtn');
  const fullNameField = document.getElementById('fullName');
  const switchText = document.getElementById('switchText');

  if (isLoginMode) {
    title.textContent = "Welcome Back";
    subtitle.textContent = "Enter your details to access your dashboard.";
    submitBtn.textContent = "Login →";
    fullNameField.style.display = "none";
    switchText.textContent = "Create one";
  } else {
    title.textContent = "Create Account";
    subtitle.textContent = "Join thousands managing their finances smarter.";
    submitBtn.textContent = "Create Account →";
    fullNameField.style.display = "block";
    switchText.textContent = "Login instead";
  }
}

function resetToLogin() {
  isLoginMode = true;
  updateModalMode();
}

// Password Toggle
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');

togglePassword.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePassword.textContent = isPassword ? '🙈' : '👁️';
});

// Form Submission (Demo)
document.getElementById('authForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  
  if (isLoginMode) {
    alert(`✅ Login successful for ${email}\n\n(This is a demo)`);
  } else {
    const name = document.getElementById('fullName').value;
    alert(`🎉 Account created successfully for ${name} (${email})\n\nWelcome to StarTech!`);
  }
  
  closeModal();
});