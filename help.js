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
