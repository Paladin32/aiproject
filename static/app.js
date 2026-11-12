const promptBox = document.querySelector("#prompt");
const generateButton = document.querySelector("#generate");
const output = document.querySelector("#output");
const errorBox = document.querySelector("#error");
const copyButton = document.querySelector("#copy");
const resultBox = document.querySelector("#result");

promptBox.addEventListener("input", () => {
  document.querySelector("#counter").textContent = `${promptBox.value.length} / 2000`;
});

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    promptBox.value = button.dataset.prompt;
    promptBox.dispatchEvent(new Event("input"));
    promptBox.focus();
  });
});

generateButton.addEventListener("click", async () => {
  errorBox.textContent = "";
  const prompt = promptBox.value.trim();
  if (prompt.length < 3) {
    errorBox.textContent = "Décris ce que tu veux créer.";
    return;
  }
  generateButton.disabled = true;
  generateButton.textContent = "Traitement…";
  resultBox.hidden = false;
  document.querySelector("#result-title").textContent = "Génération en cours…";
  output.textContent = "";
  document.querySelector("#explanation").textContent = "";
  document.querySelector("#steps").replaceChildren();
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({prompt})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erreur serveur.");
    document.querySelector("#result-title").textContent = data.title;
    document.querySelector("#language").textContent = data.language.toUpperCase();
    document.querySelector("#explanation").textContent = data.explanation;
    output.textContent = data.code;
    (data.next_steps || []).forEach(step => {
      const item = document.createElement("p");
      item.textContent = "→ " + step;
      document.querySelector("#steps").append(item);
    });
    copyButton.disabled = data.language === "text";
    resultBox.scrollIntoView({behavior: "smooth", block: "start"});
  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    generateButton.disabled = false;
    generateButton.innerHTML = 'Générer <b>↗</b>';
  }
});

copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(output.textContent);
  copyButton.textContent = "Copié !";
  setTimeout(() => copyButton.textContent = "Copier le code", 1400);
});
