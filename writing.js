const params = new URLSearchParams(window.location.search);
const studentName = params.get("name") || localStorage.getItem("studentName");
const test = params.get("test") || localStorage.getItem("selectedTest");

const timerDisplay = document.getElementById("timer");
const form = document.getElementById("writing-form");

let submitted = false;
let timeLeft = 60 * 60;

if (!studentName || !test) {
  alert("Missing name or test. Redirecting...");
  window.location.href = "index.html";
}

document.getElementById("student-info").textContent = `Student: ${studentName} | Test: ${test.toUpperCase()}`;

fetch(`tests/${test}/writing.json`)
  .then(res => res.json())
  .then(data => {
    document.getElementById("task1-instructions").innerHTML = `
      <p>${data.task1_instructions.replace(/\n/g, '<br>')}</p>
    `;
    document.getElementById("task1-image").src = `tests/${test}/${data.task1_image}`;

    document.getElementById("task2-content").innerHTML = `
      <p>${data.task2_prompt.replace(/\n/g, '<br>')}</p>
    `;
  });

function updateTimer() {
  const min = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const sec = String(timeLeft % 60).padStart(2, '0');
  timerDisplay.textContent = `Time Left: ${min}:${sec}`;
  timeLeft--;

  if (timeLeft === 300) {
    alert("⚠️ Only 5 minutes remaining! Please finalize your writing.");
  }

  if (timeLeft < 0 && !submitted) {
    alert("⏰ Time is up! Your writing will now be submitted automatically.");
    submitWriting(true); 
  }
}

const timer = setInterval(updateTimer, 1000);
updateTimer();

function submitWriting(auto = false) {
  if (submitted) return;
  submitted = true;
  clearInterval(timer);

  const formData = new FormData(form);
  const task1 = formData.get("task1_answer") || "";
  const task2 = formData.get("task2_answer") || "";

  const content = `Student: ${studentName}\nTest: ${test}\n\nTask 1:\n${task1}\n\nTask 2:\n${task2}`;
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${studentName}_writing_${test}.txt`;
  a.click();

  if (!auto) {
    alert("✅ Writing submitted successfully.");
  }
}
