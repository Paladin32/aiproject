const promptBox = document.querySelector("#prompt");
const generateButton = document.querySelector("#generate");
const output = document.querySelector("#output");
const errorBox = document.querySelector("#error");
const copyButton = document.querySelector("#copy");

generateButton.addEventListener("click", async () => {
  errorBox.textContent = "";
  const prompt = promptBox.value.trim();
  if (!prompt) {
    errorBox.textContent = "Ajoute un prompt avant de lancer la génération.";
    return;
  }
  generateButton.disabled = true;
  generateButton.textContent = "Génération…";
  output.textContent = "Le réseau neuronal calcule…";
  copyButton.disabled = true;
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({prompt})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");
    output.textContent = data.generated;
    copyButton.disabled = false;
  } catch (error) {
    output.textContent = "Aucune génération disponible.";
    errorBox.textContent = error.message;
  } finally {
    generateButton.disabled = false;
    generateButton.innerHTML = 'Générer <b>↗</b>';
  }
});

copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(output.textContent);
  copyButton.textContent = "Copié !";
  setTimeout(() => copyButton.textContent = "Copier", 1200);
});
