async function loadListeningTest() {
  const params = new URLSearchParams(window.location.search);
  const test = params.get("test");
  if (!test) return alert("No test specified in URL (e.g. ?test=test1)");

  const container = document.getElementById("listening-container");
  const audio = document.getElementById("audio-player");
  audio.src = `tests/${test}/audio.mp3`;

  try {
    const res = await fetch(`tests/${test}/listening.json?t=${Date.now()}`);
    const data = await res.json();

    data.parts.forEach(part => {
      const partDiv = document.createElement("div");
      partDiv.className = "part";
      partDiv.innerHTML = `<h2>Part ${part.part}</h2><p>${part.instructions}</p>`;

      if (part.image) {
        const img = document.createElement("img");
        img.src = `tests/${test}/${part.image}`;
        img.style = "max-width:100%; margin: 10px 0;";
        partDiv.appendChild(img);
      }

      if (part.type === "table_completion") {
        const table = document.createElement("table");
        table.innerHTML = "<thead><tr><th>#</th><th>Prompt</th><th>Answer</th></tr></thead>";
        const tbody = document.createElement("tbody");

        part.questions.forEach(q => {
          const row = document.createElement("tr");
          const qPrompt = `<td>${q.number}</td><td>${q.prompt}</td>`;
          let input = "<td>";

          if (q.input_type === "short_text") {
            input += `<input type="text" name="q${q.number}" />`;
          } else if (q.input_type === "dropdown" && q.options) {
            input += `<select name="q${q.number}">` +
              q.options.map(opt => `<option value="${opt}">${opt}</option>`).join('') +
              `</select>`;
          }

          input += "</td>";
          row.innerHTML = qPrompt + input;
          tbody.appendChild(row);
        });

        table.appendChild(tbody);
        partDiv.appendChild(table);
      } else {
        part.questions.forEach(q => {
          const div = document.createElement("div");
          div.className = "question";
          
          if (q.input_type === "checkbox" && q.options) {
            const promptLabel = document.createElement("label");
            promptLabel.innerHTML = `<strong>${q.number}.</strong> ${q.prompt}`;
            div.appendChild(promptLabel);
            div.appendChild(document.createElement("br"));

            const maxChoices = typeof q.max_choices === 'number' ? q.max_choices : 1;
            
            const optionsContainer = document.createElement("div");
            optionsContainer.className = "checkbox-options";
            
            q.options.forEach((opt, idx) => {
              const letter = String.fromCharCode(65 + idx); 
              
              const label = document.createElement("label");
              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.name = `q${q.number}${letter}`;
              checkbox.value = letter;
              checkbox.dataset.question = `q${q.number}`;
              
              label.appendChild(checkbox);
              label.appendChild(document.createTextNode(` ${opt}`));
              
              optionsContainer.appendChild(label);
              optionsContainer.appendChild(document.createElement("br"));
            });
            
            div.appendChild(optionsContainer);

            const checkboxes = div.querySelectorAll(`input[type="checkbox"]`);
            checkboxes.forEach(checkbox => {
              checkbox.addEventListener('change', function() {
                const selected = Array.from(checkboxes).filter(cb => cb.checked).length;
                
                if (selected > maxChoices) {
                  this.checked = false;
                  alert(`You can select maximum ${maxChoices} option(s) for this question.`);
                }
              });
            });
          } else {
            div.innerHTML = `<label>${q.number}. ${q.prompt}</label><br/>`;

            if (q.input_type === "short_text") {
              div.innerHTML += `<input type="text" name="q${q.number}" />`;
            } else if (q.input_type === "dropdown" && q.options) {
              div.innerHTML += `<select name="q${q.number}">` +
                q.options.map(opt => `<option value="${opt}">${opt}</option>`).join('') +
                `</select>`;
            }
          }

          partDiv.appendChild(div);
        });
      }
      container.appendChild(partDiv);
    });
  } catch (err) {
    container.innerHTML = "<p style='color:red;'>Failed to load test content.</p>";
  }
}

async function submitListening() {

  const params = new URLSearchParams(window.location.search);
  const test = params.get("test");
  const form = document.getElementById("listening-form");
  const formData = new FormData(form);

  try {
    const res = await fetch(`tests/${test}/answers.json`);
    const answerData = await res.json();

    let answers = [];
    if (Array.isArray(answerData)) {
      answers = answerData;
    } else if (answerData.answers && Array.isArray(answerData.answers)) {
      answers = answerData.answers;
    } else {
      throw new Error("Invalid answer key format");
    }

    const results = [];
    const userAnswers = {};

    for (const [name, value] of formData.entries()) {
      if (!userAnswers[name]) userAnswers[name] = [];
      if (value) userAnswers[name].push(value);
    }

    answers.forEach(a => {
      let userValues = [];
      let answerKey = `q${a.number}`;

      if (typeof a.number === 'string' && a.number.match(/[A-Z]$/)) {
        const baseNum = a.number.slice(0, -1);
        const letter = a.number.slice(-1);
        answerKey = `q${baseNum}${letter}`;
        userValues = userAnswers[answerKey] || [];
      }else{
        userValues = userAnswers[answerKey] || [];
      } 
      const userAnswer = userValues.join(", ");

      let isCorrect = false;
      
      if (typeof a.number === 'string' && a.number.match(/[A-Z]$/)) {
        isCorrect = userValues.length > 0 && a.accepted.some(acc => 
          userValues.includes(acc)
        );
      }
      else {
        isCorrect = a.accepted.some(acc => 
          userValues.some(val => val.trim().toLowerCase() === acc.trim().toLowerCase())
        );
      }

      results.push({
        number: a.number,
        user: userAnswer,
        accepted: a.accepted.join(", "),
        correct: isCorrect
      });
    });

    const correctCount = results.filter(r => r.correct).length;
    const band = correctCount >= 39 ? 9 :
                 correctCount >= 37 ? 8.5 :
                 correctCount >= 35 ? 8 :
                 correctCount >= 33 ? 7.5 :
                 correctCount >= 30 ? 7 :
                 correctCount >= 27 ? 6.5 :
                 correctCount >= 23 ? 6 :
                 correctCount >= 18 ? 5.5 :
                 correctCount >= 15 ? 5 :
                 correctCount >= 12 ? 4.5 : "< 4.5";

    document.getElementById("score-display").innerText = `Correct Answers: ${correctCount}/40`;
    document.getElementById("band-display").innerText = `Estimated IELTS Band: ${band}`;
    document.getElementById("result-section").style.display = "block";

    const table = `<table><thead><tr><th>#</th><th>Your Answer</th><th>Accepted</th><th>✓</th></tr></thead><tbody>` +
      results.map(r => `<tr><td>${r.number}</td><td>${r.user}</td><td>${r.accepted}</td><td>${r.correct ? "✔️" : "❌"}</td></tr>`).join("") +
      "</tbody></table>";
    document.getElementById("answer-table").innerHTML = table;

  } catch (err) {
    console.error("Error submitting answers:", err);
    alert("Failed to load answer key. Please check console for details.");
  }
}

function disablePause() {
  const audio = document.getElementById("audio-player");
  audio.addEventListener("pause", () => audio.play());
}

window.onload = loadListeningTest;