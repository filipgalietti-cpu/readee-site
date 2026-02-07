const startBtn = document.getElementById("startBtn");
const newsletterForm = document.getElementById("newsletterForm");
const newsletterMessage = document.getElementById("newsletterMessage");

startBtn.addEventListener("click", () => {
  alert("Welcome to BrightSteps! Your first quest is ready.");
});

newsletterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = new FormData(newsletterForm).get("email");

  newsletterMessage.textContent = `Thanks! We\'ll send the starter kit to ${email}.`;
  newsletterForm.reset();
});
