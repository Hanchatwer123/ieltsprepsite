async function loadListeningTest() {
  const params = new URLSearchParams(window.location.search);
  const test = params.get("test");
  if (!test) {
    // Using a custom modal-like message instead of alert
    const container = document.getElementById("listening-container");
    container.innerHTML = `
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong class="font-bold">Error!</strong>
        <span class="block sm:inline">No test specified in URL (e.g., ?test=test1).</span>
      </div>
    `;
    return;
  }

  const container = document.getElementById("listening-container");
  const audio = document.getElementById("audio-player");
  audio.src = `tests/${test}/audio.mp3`;

  try {
    const res = await fetch(`tests/${test}/listening.json?t=${Date.now()}`);
    const data = await res.json();

    data.parts.forEach(part => {
      const partDiv = document.createElement("div");
      // Apply Tailwind classes for styling, matching the image design
      partDiv.className = "part-container mb-6 p-6 bg-white rounded-lg shadow-md";
      partDiv.innerHTML = `
        <h2 class="text-xl font-bold text-gray-800 mb-2">Part ${part.part}</h2>
        <p class="text-gray-600 mb-4">${part.instructions}</p>
      `;

      if (part.image) {
        const img = document.createElement("img");
        img.src = `tests/${test}/${part.image}`;
        // Tailwind classes for responsive image styling
        img.className = "max-w-full h-auto rounded-md my-4 shadow-sm";
        partDiv.appendChild(img);
      }

      if (part.type === "table_completion") {
        const tableContainer = document.createElement("div");
        tableContainer.className = "table-completion-container overflow-x-auto"; // For responsive tables
        const table = document.createElement("table");
        table.className = "min-w-full divide-y divide-gray-200"; // Tailwind table styling
        table.innerHTML = `
          <thead>
            <tr>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prompt</th>
              <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answer</th>
            </tr>
          </thead>
        `;
        const tbody = document.createElement("tbody");
        tbody.className = "bg-white divide-y divide-gray-200";

        part.questions.forEach(q => {
          const row = document.createElement("tr");
          row.className = "hover:bg-gray-50";
          const qPrompt = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${q.number}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${q.prompt}</td>
          `;
          let inputTd = `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">`;

          if (q.input_type === "short_text") {
            inputTd += `<input type="text" name="q${q.number}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />`;
          } else if (q.input_type === "dropdown" && q.options) {
            inputTd += `<select name="q${q.number}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">` +
              q.options.map(opt => `<option value="${opt}">${opt}</option>`).join('') +
              `</select>`;
          }

          inputTd += "</td>";
          row.innerHTML = qPrompt + inputTd;
          tbody.appendChild(row);
        });

        table.appendChild(tbody);
        tableContainer.appendChild(table);
        partDiv.appendChild(tableContainer);
      } else {
        part.questions.forEach(q => {
          const div = document.createElement("div");
          div.className = "question mb-4"; // Spacing for questions

          if (q.input_type === "checkbox" && q.options) {
            const promptLabel = document.createElement("p");
            promptLabel.className = "text-gray-700 mb-2";
            promptLabel.innerHTML = `<span class="question-number">${q.number}.</span> ${q.prompt}`;
            div.appendChild(promptLabel);

            const maxChoices = typeof q.max_choices === 'number' ? q.max_choices : 1;
            
            const optionsContainer = document.createElement("div");
            optionsContainer.className = "checkbox-options space-y-2"; // Spacing between checkbox options
            
            q.options.forEach((opt, idx) => {
              const letter = String.fromCharCode(65 + idx); 
              
              const label = document.createElement("label");
              label.className = "inline-flex items-center text-gray-700 cursor-pointer";
              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.name = `q${q.number}${letter}`;
              checkbox.value = letter;
              checkbox.dataset.question = `q${q.number}`;
              checkbox.className = "form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"; // Tailwind checkbox styling
              
              label.appendChild(checkbox);
              label.appendChild(document.createTextNode(` ${opt}`));
              
              optionsContainer.appendChild(label);
            });
            
            div.appendChild(optionsContainer);

            const checkboxes = div.querySelectorAll(`input[type="checkbox"]`);
            checkboxes.forEach(checkbox => {
              checkbox.addEventListener('change', function() {
                const selected = Array.from(checkboxes).filter(cb => cb.checked).length;
                
                if (selected > maxChoices) {
                  this.checked = false;
                  // Custom modal-like message instead of alert
                  const messageDiv = document.createElement("div");
                  messageDiv.className = "fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center";
                  messageDiv.innerHTML = `
                    <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto text-center">
                      <p class="text-lg font-semibold text-gray-800 mb-4">You can select a maximum of ${maxChoices} option(s) for this question.</p>
                      <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg" onclick="this.closest('.fixed').remove()">OK</button>
                    </div>
                  `;
                  document.body.appendChild(messageDiv);
                }
              });
            });
          } else {
            div.innerHTML = `
              <label class="block text-gray-700 text-base mb-1">
                <span class="question-number">${q.number}.</span> ${q.prompt}
              </label>
            `;

            if (q.input_type === "short_text") {
              div.innerHTML += `<input type="text" name="q${q.number}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />`;
            } else if (q.input_type === "dropdown" && q.options) {
              div.innerHTML += `<select name="q${q.number}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">` +
                q.options.map(opt => `<option value="${opt}">${opt}</option>`).join('') +
                `</select>`;
            }
          }

          partDiv.appendChild(div);
        });
      }
      container.appendChild(partDiv);
    });

    // Add event listeners to all input fields to mark questions as answered in real-time
    const formElements = document.getElementById("listening-form").elements;
    Array.from(formElements).forEach(element => {
      if (element.name && element.name.startsWith("q")) {
        if (element.type === 'text' || element.tagName === 'TEXTAREA') {
          element.addEventListener('input', () => {
            const userAnswers = collectUserAnswers();
            markAnsweredQuestions(userAnswers);
          });
        } else { // Covers select, radio, checkbox
          element.addEventListener('change', () => {
            const userAnswers = collectUserAnswers();
            markAnsweredQuestions(userAnswers);
          });
        }
      }
    });
    
    // Initial marking of questions on load
    markAnsweredQuestions(collectUserAnswers());

  } catch (err) {
    container.innerHTML = `
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong class="font-bold">Error!</strong>
        <span class="block sm:inline">Failed to load test content. Please check console for details.</span>
      </div>
    `;
    console.error("Failed to load test content:", err);
  }
}

// Helper function to collect user answers from the form
function collectUserAnswers() {
  const formElements = document.getElementById("listening-form").elements;
  const userAnswers = {}; // Stores key-value pairs like { "q1": ["user_text"], "q2A": ["A"], "q3": ["Option 1"] }

  for (let i = 0; i < formElements.length; i++) {
    const element = formElements[i];
    if (element.name && element.name.startsWith("q")) {
      const qname = element.name; // e.g., q1, q2A, q3

      if (element.type === "text" || element.tagName === "SELECT") {
        if (element.value.trim()) {
          userAnswers[qname] = [element.value.trim()];
        }
      } else if (element.type === "checkbox" && element.checked) {
        if (!userAnswers[qname]) userAnswers[qname] = [];
        userAnswers[qname].push(element.value); // Store the checkbox value (e.g., 'A', 'B')
      }
    }
  }
  return userAnswers;
}

// Marks answered questions in blue
function markAnsweredQuestions(userAnswers) {
  // Remove existing markings
  document.querySelectorAll('.answered-question-prompt').forEach(el => el.classList.remove('answered-question-prompt'));
  document.querySelectorAll('.answered-input-field').forEach(el => el.classList.remove('answered-input-field'));

  // Iterate over all individual question containers
  const questionContainers = document.querySelectorAll('.question.mb-4, .table-completion-container tbody tr');

  questionContainers.forEach(qContainer => {
    let questionNumber = null;
    let promptElement = null; // The element to mark blue (e.g., label or p)
    let inputElements = []; // All inputs within this question

    if (qContainer.classList.contains('question')) {
      // For standard question divs
      const qNumSpan = qContainer.querySelector('.question-number');
      if (qNumSpan) {
        questionNumber = qNumSpan.textContent.replace('.', '').trim(); // "1." -> "1"
      }
      promptElement = qContainer.querySelector('label, p'); // Get the direct prompt label/paragraph
      inputElements = Array.from(qContainer.querySelectorAll('input, select'));
      
      // Special handling for checkbox groups, as their inputs have names like q2A, q2B
      // We need to check if ANY of the checkboxes for a given base question number are checked.
      if (inputElements.some(input => input.type === 'checkbox')) {
        const baseQNumPrefix = `q${questionNumber}`; // e.g., "q2"
        // Check if any specific checkbox (like q2A, q2B) has a value in userAnswers
        const anyCheckboxAnswered = Object.keys(userAnswers).some(key => 
          key.startsWith(baseQNumPrefix) && userAnswers[key] && userAnswers[key].length > 0
        );
        if (anyCheckboxAnswered) {
          if (promptElement) promptElement.classList.add('answered-question-prompt');
          inputElements.forEach(input => input.classList.add('answered-input-field'));
        }
      } else {
        // For non-checkbox questions (text, dropdown)
        const inputName = `q${questionNumber}`;
        if (userAnswers[inputName] && userAnswers[inputName].length > 0) {
          if (promptElement) promptElement.classList.add('answered-question-prompt');
          inputElements.forEach(input => input.classList.add('answered-input-field'));
        }
      }

    } else if (qContainer.tagName === 'TR') {
      // For table completion rows (each row is a question)
      const qNumCell = qContainer.querySelector('td:first-child');
      if (qNumCell) {
        questionNumber = qNumCell.textContent.trim();
      }
      promptElement = qContainer.querySelector('td:nth-child(2)'); // The prompt cell
      inputElements = Array.from(qContainer.querySelectorAll('input, select'));

      const inputName = `q${questionNumber}`;
      if (userAnswers[inputName] && userAnswers[inputName].length > 0) {
        if (promptElement) promptElement.classList.add('answered-question-prompt');
        inputElements.forEach(input => input.classList.add('answered-input-field'));
      }
    }
  });
}


async function submitListening() {
  const params = new URLSearchParams(window.location.search);
  const test = params.get("test");
  const form = document.getElementById("listening-form");
  // const formData = new FormData(form); // No longer strictly needed if collectUserAnswers is used directly

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
    // Use the new helper function to collect user answers
    const userAnswers = collectUserAnswers(); 

    answers.forEach(a => {
      let userValues = [];
      let answerKeyName = `q${a.number}`; // Default key name for single inputs

      // Special handling for checkbox questions (e.g., "1A", "1B")
      if (typeof a.number === 'string' && a.number.match(/[A-Z]$/)) {
        // For answer keys like { number: "1A", accepted: ["A"] }
        answerKeyName = `q${a.number}`; // The name will be like "q1A"
        userValues = userAnswers[answerKeyName] || [];
      } else {
        // For typical questions (number only)
        userValues = userAnswers[answerKeyName] || [];
      }
      
      const userAnswerJoined = userValues.join(", "); // Join multiple values if they exist (e.g., checkboxes)

      let isCorrect = false;
      
      // Compare user's normalized answers with accepted normalized answers
      const normalizedUserValues = userValues.map(val => val.trim().toLowerCase());
      const normalizedAcceptedAnswers = a.accepted.map(acc => acc.trim().toLowerCase());

      if (a.accepted.length > 1 || (typeof a.number === 'string' && a.number.match(/[A-Z]$/))) {
        // For multiple accepted answers (e.g., exact phrases) or individual checkboxes (1A, 1B)
        // Check if every user value is present in the accepted list
        isCorrect = normalizedUserValues.length > 0 && normalizedUserValues.every(val => normalizedAcceptedAnswers.includes(val));
        // Additionally, for checkboxes, ensure no extra answers were selected beyond what's accepted for that specific checkbox label
        if (isCorrect && (typeof a.number === 'string' && a.number.match(/[A-Z]$/))) {
          isCorrect = normalizedUserValues.length === normalizedAcceptedAnswers.length;
        }
      } else {
        // For single answer questions (short text, dropdown)
        isCorrect = normalizedUserValues.some(val => normalizedAcceptedAnswers.includes(val));
      }


      results.push({
        number: a.number,
        user: userAnswerJoined,
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

    const table = `<table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Answer</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accepted</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">✓</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">` +
      results.map(r => `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${r.number}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${r.user}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${r.accepted}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">${r.correct ? "✔️" : "❌"}</td>
        </tr>`).join("") +
      "</tbody></table>";
    document.getElementById("answer-table").innerHTML = table;

  } catch (err) {
    console.error("Error submitting answers:", err);
    // Custom modal-like message instead of alert
    const messageDiv = document.createElement("div");
    messageDiv.className = "fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center";
    messageDiv.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto text-center">
        <p class="text-lg font-semibold text-gray-800 mb-4">Failed to load answer key. Please check console for details.</p>
        <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg" onclick="this.closest('.fixed').remove()">OK</button>
      </div>
    `;
    document.body.appendChild(messageDiv);
  }
}

function disablePauseAndSeek() {
  const audio = document.getElementById("audio-player");
  let lastTime = 0;

  // Запретить паузу
  audio.addEventListener("pause", () => audio.play());

  // Запретить перемотку
  audio.addEventListener("timeupdate", () => {
    if (Math.abs(audio.currentTime - lastTime) > 0.5) {
      audio.currentTime = lastTime;
    } else {
      lastTime = audio.currentTime;
    }
  });

  // Убедимся, что воспроизведение запускается
  if (audio.paused) {
    audio.play();
  }
}

document.getElementById("submit-button").addEventListener("click", submitListening);

// The window.onload is handled in the HTML script block
// window.onload = loadListeningTest;
window.onload = () => {
  loadListeningTest();
  disablePauseAndSeek();
};