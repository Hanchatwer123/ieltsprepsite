let testData;
let studentName = "";
let answerKey = {};

function startTest() {
  studentName = document.getElementById("student-name").value.trim();
  if (!studentName) return alert("Enter your name to start the test.");

  document.getElementById("login-section").style.display = "none";
  document.getElementById("test-section").style.display = "block";

  Promise.all([
    fetch("tests/test1/listening.json").then(res => res.json()),
    fetch("tests/test1/answers.json").then(res => res.json())
  ]).then(([test, answers]) => {
    testData = test;
    answers.answers.forEach(({ number, accepted }) => {
      answerKey[number] = accepted;
    });
    renderQuestions();
  });
}

// (Removed duplicate submitAnswers function to avoid logical errors)

function renderQuestions() {
  const form = document.getElementById("listening-form");
  form.innerHTML = "";

  testData.parts.forEach((part) => {
    const partDiv = document.createElement("div");
    partDiv.className = "part";
    const header = document.createElement("h3");
    header.innerText = `Part ${part.part}: ${part.type.replace("_", " ")}`;
    partDiv.appendChild(header);

    if (part.image) {
      const img = document.createElement("img");
      img.src = `tests/test1/${part.image}`;
      partDiv.appendChild(img);
    }

    part.questions.forEach((question) => {
      const qDiv = document.createElement("div");
      qDiv.className = "question";
      const label = document.createElement("label");
      label.innerText = `${question.number}. ${question.prompt}`;
      qDiv.appendChild(label);

      if (question.input_type === "multiple_choice" || question.input_type === "checkbox") {
        question.options.forEach((option, idx) => {
          const input = document.createElement("input");
          input.type = question.input_type === "checkbox" ? "checkbox" : "radio";
          input.name = `q${question.number}`;
          input.value = option.trim().replace(/^\w\.\s*/, ""); // remove 'A. ' prefix
          input.id = `q${question.number}_opt${idx}`;

          const optLabel = document.createElement("label");
          optLabel.setAttribute("for", input.id);
          optLabel.innerText = option;

          const optDiv = document.createElement("div");
          optDiv.appendChild(input);
          optDiv.appendChild(optLabel);
          qDiv.appendChild(optDiv);
        });
      } else if (question.input_type === "dropdown") {
        const select = document.createElement("select");
        select.name = `q${question.number}`;
        question.options.forEach((option) => {
          const opt = document.createElement("option");
          opt.value = option.trim().replace(/^\w\.\s*/, "");
          opt.innerText = option;
          select.appendChild(opt);
        });
        qDiv.appendChild(select);
      } else {
        const input = document.createElement("input");
        input.type = "text";
        input.name = `q${question.number}`;
        qDiv.appendChild(input);
      }

      partDiv.appendChild(qDiv);
    });

    form.appendChild(partDiv);
  });
}

function normalizeArray(arr) {
  return arr.map(s => s.trim().toLowerCase()).sort();
}

function submitAnswers() {
  const form = document.getElementById("listening-form");
  const formData = new FormData(form);
  const answers = {};

  for (let [key, value] of formData.entries()) {
    const qnum = parseInt(key.replace("q", ""));
    if (!answers[qnum]) {
      answers[qnum] = [];
    }
    answers[qnum].push(value.trim());
  }

  let correctCount = 0;

  testData.parts.forEach((part) => {
    part.questions.forEach((question) => {
      const qnum = question.number;
      const userAnswer = answers[qnum] || [];
      const correctAnswer = answerKey[qnum];

      let isCorrect = false;

      if (Array.isArray(correctAnswer)) {
        const normalizedUser = normalizeArray(userAnswer);
        const normalizedCorrect = normalizeArray(correctAnswer);
        isCorrect = JSON.stringify(normalizedUser) === JSON.stringify(normalizedCorrect);
      } else {
        isCorrect = userAnswer[0] && correctAnswer.toLowerCase().trim() === userAnswer[0].toLowerCase().trim();
      }

      if (isCorrect) correctCount++;
    });
  });

  localStorage.setItem("listeningScore", correctCount);
  window.location.href = "result.html";
}
