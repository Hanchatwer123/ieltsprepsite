const params = new URLSearchParams(window.location.search);
const studentName = params.get("name") || localStorage.getItem("studentName");
const test = params.get("test") || localStorage.getItem("selectedTest");

const passageDiv = document.getElementById("passage-section");
const questionDiv = document.getElementById("question-section");
const studentInfo = document.getElementById("student-info");
const passageNavigationDiv = document.getElementById("passage-navigation");

// Splitter elements
const readingContainer = document.getElementById("reading-container");
const splitter = document.getElementById("splitter");

let isResizing = false;

// Function to display custom alert messages
function showCustomAlert(message) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center";
  messageDiv.innerHTML = `
    <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto text-center">
      <p class="text-lg font-semibold text-gray-800 mb-4">${message}</p>
      <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg" onclick="this.closest('.fixed').remove()">OK</button>
    </div>
  `;
  document.body.appendChild(messageDiv);
}

if (!studentName || !test) {
  showCustomAlert("Missing name or test. Redirecting to home...");
  setTimeout(() => {
    window.location.href = "index.html";
  }, 1500); // Redirect after a short delay
}

studentInfo.textContent = `Student: ${studentName} | Test: ${test.toUpperCase()}`;

// Store all loaded passages and question blocks
let allPassageBlocks = [];
let allQuestionBlocks = [];
let testData = null; // Store fetched test data

// Splitter functionality
splitter.addEventListener('mousedown', function(e) {
  isResizing = true;
  document.addEventListener('mousemove', resize);
  document.addEventListener('mouseup', stopResize);
});

function resize(e) {
  if (!isResizing) return;
  const containerWidth = readingContainer.offsetWidth;
  const newPassageWidth = e.clientX - readingContainer.getBoundingClientRect().left;
  
  // Ensure minimum width for both sections
  const minWidth = 200; // pixels
  if (newPassageWidth < minWidth || (containerWidth - newPassageWidth - 20) < minWidth) { // 20px for gap + splitter
    return;
  }

  const passagePercentage = (newPassageWidth / containerWidth) * 100;
  const questionPercentage = 100 - passagePercentage;

  readingContainer.style.gridTemplateColumns = `${passagePercentage}% ${questionPercentage}%`;
  splitter.style.right = `calc(${questionPercentage}% - 8px)`; // Adjusted for new splitter width
}

function stopResize() {
  isResizing = false;
  document.removeEventListener('mousemove', resize);
  document.removeEventListener('mouseup', stopResize);
}

// Helper function to collect user answers from the form
function collectUserAnswers() {
  const formElements = document.getElementById("reading-form").elements;
  const userAnswers = {};

  for (let i = 0; i < formElements.length; i++) {
    const element = formElements[i];
    if (element.name && element.name.startsWith("q")) {
      const qnum = element.name.replace("q", "");
      const baseQnumMatch = qnum.match(/^\d+/);
      const baseQnum = baseQnumMatch ? baseQnumMatch[0] : null;

      if (baseQnum) {
        if (!userAnswers[baseQnum]) userAnswers[baseQnum] = [];
        
        if (element.type === "radio" && element.checked) {
          userAnswers[baseQnum].push(element.value);
        } 
        else if (element.type === "checkbox" && element.checked) {
          userAnswers[baseQnum].push(element.value);
        }
        else if (element.tagName === "SELECT" && element.value) {
          userAnswers[baseQnum].push(element.value);
        } else if (element.type === "text" && element.value.trim()) {
          userAnswers[baseQnum].push(element.value.trim());
        }
      }
    }
  }
  return userAnswers;
}


async function loadReadingTest() {
  try {
    const res = await fetch(`tests/${test}/reading.json?t=${Date.now()}`);
    testData = await res.json(); // Store data globally

    passageDiv.innerHTML = "";
    questionDiv.innerHTML = "";
    passageNavigationDiv.innerHTML = ''; // Clear previous buttons
    allPassageBlocks = []; // Reset stored blocks
    allQuestionBlocks = []; // Reset stored blocks

    testData.passages.forEach((passage, idx) => {
      const passageBlock = document.createElement("div");
      passageBlock.id = `passage-${idx + 1}`; // Assign ID for navigation
      passageBlock.className = "mb-8 p-6 bg-white rounded-lg shadow-md";
      
      const paragraphs = passage.text.split('\n\n')
        .map(p => `<p class="mb-4 leading-relaxed text-gray-700">${p}</p>`)
        .join('');
  
      passageBlock.innerHTML = `
        <h2 class="text-xl font-bold text-gray-800 mb-4">Passage ${idx + 1}: ${passage.title}</h2>
        ${paragraphs}
      `;
      
      passageDiv.appendChild(passageBlock);
      allPassageBlocks.push(passageBlock); // Store reference

      // Create navigation button for this passage
      const navButton = document.createElement("button");
      navButton.textContent = `Passage ${idx + 1}`;
      navButton.className = "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out";
      navButton.onclick = () => showPassageAndQuestions(idx + 1); // Pass index to show function
      passageNavigationDiv.appendChild(navButton);

      // Create question blocks for this passage
      passage.questions.forEach(group => {
        const block = document.createElement("div");
        block.className = "question-block mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200";
        block.dataset.passageId = idx + 1; // Link question block to its passage
        const title = document.createElement("h3");
        title.className = "text-lg font-semibold text-gray-800 mb-3";
        title.textContent = group.title || group.group_type;
        block.appendChild(title);

        if (group.instruction) {
          const instruction = document.createElement("p");
          instruction.className = "text-sm italic text-gray-600 mb-4";
          instruction.innerHTML = group.instruction.replace(/\n/g, '<br>');
          block.appendChild(instruction);
        }

        if (group.image) {
            const imageContainer = document.createElement("div");
            imageContainer.className = "text-center my-4";
            const img = document.createElement("img");
            img.src = `tests/${test}/${group.image}`; 
            img.alt = `Diagram for ${group.group_type}`;
            img.className = "max-w-full h-auto rounded-md shadow-sm inline-block";
            img.onerror = function() { 
                this.onerror = null;
                this.src = `https://placehold.co/400x300/CCCCCC/333333?text=Image+Not+Found`;
                console.error(`Image failed to load: ${this.src}`);
            };
            imageContainer.appendChild(img);
            block.appendChild(imageContainer);
        }

        group.questions.forEach(q => {
          const qDiv = document.createElement("div");
          qDiv.className = "mb-4";
          const number = q.number;
          const prompt = q.prompt || "";
          const name = `q${number}`;

          
          if (q.input_type === "checkbox") {
            qDiv.innerHTML = `<strong class="block text-gray-800 mb-2">${number}. ${prompt}</strong>`;
            const maxChoices = typeof q.max_choices === 'number' ? q.max_choices : 1;
            
            q.options.forEach((opt, idx) => {
              const optionLetter = String.fromCharCode(65 + idx);
              qDiv.innerHTML += `
                <label class="block mb-2 text-gray-700">
                  <input type="checkbox" name="${name}${optionLetter}" value="${optionLetter}" class="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500">
                  ${optionLetter}. ${opt}
                </label>
              `;
            });
            
            const checkboxes = qDiv.querySelectorAll(`input[type="checkbox"][name^="${name}"]`);
            checkboxes.forEach(checkbox => {
              checkbox.addEventListener('change', function() {
              const checked = Array.from(checkboxes).filter(cb => cb.checked);
              if (checked.length > maxChoices) {
                this.checked = false;
                showCustomAlert(`You can select at most ${maxChoices} options.`);
              }
              });
            });
            }
          else if (group.group_type === "True/False/Not Given" || q.question_type === "true_false_not_given") {
            qDiv.innerHTML = `<strong class="block text-gray-800 mb-2">${number}. ${prompt}</strong>`;
            ["TRUE", "FALSE", "NOT GIVEN"].forEach(opt => {
              qDiv.innerHTML += `
                <label class="inline-flex items-center mr-4 mb-2 text-gray-700">
                  <input type="radio" name="${name}" value="${opt}" class="form-radio h-5 w-5 text-blue-600">
                  ${opt}
                </label>
              `;
            });
          } else if (group.group_type === "Yes/No/Not Given" || q.question_type === "yes_no_not_given") {
            qDiv.innerHTML = `<strong class="block text-gray-800 mb-2">${number}. ${prompt}</strong>`;
            ["YES", "NO", "NOT GIVEN"].forEach(opt => {
              qDiv.innerHTML += `
                <label class="inline-flex items-center mr-4 mb-2 text-gray-700">
                  <input type="radio" name="${name}" value="${opt}" class="form-radio h-5 w-5 text-blue-600">
                  ${opt}
                </label>
              `;
            });
          } else if (group.group_type === "Multiple Choice" || q.question_type === "multiple_choice") {
            qDiv.innerHTML = `<strong class="block text-gray-800 mb-2">${number}. ${prompt}</strong>`;
            q.options.forEach((opt, idx) => {
              const optionLetter = String.fromCharCode(65 + idx);
              qDiv.innerHTML += `
                <label class="block mb-2 text-gray-700">
                  <input type="radio" name="${name}" value="${optionLetter}" class="form-radio h-5 w-5 text-blue-600">
                  ${optionLetter}. ${opt}
                </label>
              `;
            });
          } else if (group.group_type === "Matching Headings" || q.question_type === "matching_headings") {
            const options = q.options || [];
            const dropdown = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
            qDiv.innerHTML = `
              <label class="block text-gray-700 mb-2">${number}. ${prompt}</label>
              <select name="${name}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                <option value="">-- Select Heading --</option>
                ${dropdown}
              </select>
            `;
          } else if (group.group_type === "Matching Sentence Endings" || q.question_type === "matching_sentence_endings") {
            const options = q.options || [];
            const dropdown = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
            qDiv.innerHTML = `
              <label class="block text-gray-700 mb-2">${number}. ${prompt}</label>
              <select name="${name}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                <option value="">-- Select Ending --</option>
                ${dropdown}
              </select>
            `;
            } else if (q.input_type === "dropdown") {
            const options = q.options || [];
            const dropdown = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
            qDiv.innerHTML = `
              <label class="block text-gray-700 mb-2">${number}. ${prompt}</label>
              <select name="${name}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
              <option value="">-- Select --</option>
              ${dropdown}
              </select>
            `;
            } else if (q.input_type === "short_text") { // Specific handling for short_text inputs
            // Create the input field with the question number as a placeholder
            const inputField = `<input type="text" name="${name}" class="ielts-short-text rounded-md shadow-sm" placeholder="${number}">`;
            
            // Replace the placeholder in the prompt with the actual input field
            // If "___" is not found, it will append the input field at the end of the prompt
            // If the prompt contains "___", replace it with the input field; otherwise, append input at the end
            let formattedPrompt;
            if (prompt.includes("___")) {
              formattedPrompt = prompt.replace(/___/g, inputField);
            } else {
              formattedPrompt = prompt + " " + inputField;
            }
            
            qDiv.innerHTML = `
              <label class="block text-gray-700 mb-2">${number}. ${formattedPrompt}</label>
            `;
          } else { // Default text input for any other unhandled type
            qDiv.innerHTML = `
              <label class="block text-gray-700 mb-2">${number}. ${prompt}</label>
              <input type="text" name="${name}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
            `;
          }
          block.appendChild(qDiv);
        });

        questionDiv.appendChild(block);
        allQuestionBlocks.push(block); // Store reference
      });
    });

    // Show the first passage and its questions by default
    if (allPassageBlocks.length > 0) {
      showPassageAndQuestions(1);
    }

    // Add event listeners to all input fields to mark questions as answered in real-time
    const formElements = document.getElementById("reading-form").elements;
    Array.from(formElements).forEach(element => {
      if (element.name && element.name.startsWith("q")) {
        if (element.type === 'text' || element.tagName === 'TEXTAREA') {
          element.addEventListener('input', () => {
            const userAnswers = collectUserAnswers();
            markAnsweredQuestions(userAnswers);
          });
        } else {
          element.addEventListener('change', () => {
            const userAnswers = collectUserAnswers();
            markAnsweredQuestions(userAnswers);
          });
        }
      }
    });
    
    // Initial marking of questions on load
    markAnsweredQuestions(collectUserAnswers());

  } catch (error) {
    console.error("Error loading test:", error);
    showCustomAlert("Error loading test. Please try again.");
  }
}

// Function to show only the selected passage and its questions
function showPassageAndQuestions(passageNumber) {
  // Hide all passages
  allPassageBlocks.forEach(block => {
    block.style.display = 'none';
  });

  // Show the selected passage
  const selectedPassage = document.getElementById(`passage-${passageNumber}`);
  if (selectedPassage) {
    selectedPassage.style.display = 'block';
  }

  // Hide all question blocks
  allQuestionBlocks.forEach(block => {
    block.style.display = 'none';
  });

  // Show only question blocks related to the selected passage
  allQuestionBlocks.forEach(block => {
    if (parseInt(block.dataset.passageId) === passageNumber) {
      block.style.display = 'block';
    }
  });

  // Scroll to the top of the passage section
  passageDiv.scrollTop = 0;
  questionDiv.scrollTop = 0;
}

// Marks answered questions in blue
function markAnsweredQuestions(userAnswers) {
  // First, remove any existing markings to ensure a clean state if function is called multiple times
  document.querySelectorAll('.answered-question-prompt').forEach(el => el.classList.remove('answered-question-prompt'));
  document.querySelectorAll('.answered-input-field').forEach(el => el.classList.remove('answered-input-field'));

  // Iterate over all individual question containers (the 'div.mb-4' elements)
  const questionDivs = document.querySelectorAll('.question-block > div.mb-4');

  questionDivs.forEach(qDiv => {
    // Attempt to find the prompt element (strong or label) and extract question number
    const promptElement = qDiv.querySelector('strong.block.text-gray-800.mb-2, label.block.text-gray-700.mb-2');
    if (!promptElement) return; // Skip if no prompt element found

    const match = promptElement.textContent.match(/^(\d+)\./);
    if (!match || !match[1]) return; // Skip if question number cannot be extracted

    const questionNumber = match[1];
    const userAnswerArray = userAnswers[questionNumber];

    let isAnswered = false;

    // Check if the question number exists in userAnswers and has any value
    if (userAnswerArray && userAnswerArray.length > 0) {
      // General check for single-value inputs (text, radio, select)
      const inputElement = qDiv.querySelector(`[name="q${questionNumber}"]`); // This finds the first one, which is fine for radio/select/text
      if (inputElement) {
        if (inputElement.type === 'text') {
          // Special handling for short_text placeholder: only mark if value is not just the placeholder
          isAnswered = (inputElement.value.trim() !== '' && inputElement.value.trim() !== inputElement.placeholder);
        } else if (inputElement.tagName === 'SELECT') {
          isAnswered = (inputElement.value.trim() !== '');
        } else if (inputElement.type === 'radio') {
          // For radio, if it's in userAnswers, it means one was selected
          isAnswered = true;
        }
      } else {
        // This path is primarily for checkbox groups. If userAnswerArray has elements, then some checkboxes were checked.
        isAnswered = true;
      }
    }

    if (isAnswered) {
      promptElement.classList.add('answered-question-prompt');
      const inputFields = qDiv.querySelectorAll('input, select'); // This selects all inputs/selects within the qDiv
      inputFields.forEach(input => {
        input.classList.add('answered-input-field');
      });
    }
  });
}


function submitReading() {
  const resultSection = document.getElementById("result-section");
  resultSection.style.display = "none";
  const oldFeedback = resultSection.querySelector("div");
  if (oldFeedback) oldFeedback.remove();

  const userAnswers = collectUserAnswers(); // Use the new helper function

  fetch(`tests/${test}/reading_answers.json`)
    .then(res => res.json())
    .then(answerKey => {
      let answersArray = [];
      if (Array.isArray(answerKey)) {
        answersArray = answerKey;
      } else if (answerKey.answers && Array.isArray(answerKey.answers)) {
        answersArray = answerKey.answers;
      } else if (typeof answerKey === 'object' && answerKey.answers === undefined) {
        answersArray = Object.entries(answerKey).map(([number, accepted]) => ({
          number,
          accepted: [accepted]
        }));
      }

      const results = [];
      let correctCount = 0;

      answersArray.forEach(q => {
        const userAns = userAnswers[q.number] || [];
        const normalizedUser = userAns.map(u => u.trim().toLowerCase());
        const normalizedAccepted = q.accepted.map(a => a.trim().toLowerCase());
        
        let isCorrect;
        
        if (q.accepted.length > 1) { // For questions with multiple possible correct answers or multiple required answers (e.g., checkboxes)
          if (normalizedUser.length !== normalizedAccepted.length) {
            isCorrect = false;
          } else {
            // Check if all user answers are in the accepted answers, and no extra answers
            isCorrect = normalizedUser.every(u => normalizedAccepted.includes(u)) && 
                        normalizedAccepted.every(a => normalizedUser.includes(a));
          }
        } 
        else { // For single correct answer questions (text, radio, select, T/F/NG, Y/N/NG)
          isCorrect = normalizedUser.some(u => normalizedAccepted.includes(u));
        }

        if (isCorrect) correctCount++;
        
        results.push({
          number: q.number,
          user: userAns.join(", ") || "",
          accepted: q.accepted.join(", "),
          correct: isCorrect
        });
      });

      const band = getBand(correctCount);
      const totalQuestions = answersArray.length;

      document.getElementById("score-display").textContent = `Correct Answers: ${correctCount}/${totalQuestions}`;
      document.getElementById("band-display").textContent = `Estimated IELTS Band: ${band}`;
      
      const feedback = document.createElement("div");
      feedback.innerHTML = `
        <h3 class="text-xl font-bold text-gray-800 mb-4">Answer Feedback</h3>
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Answer</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accepted Answers</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody id="feedback-list" class="bg-white divide-y divide-gray-200"></tbody>
        </table>
      `;
      
      resultSection.appendChild(feedback);
      const feedbackList = feedback.querySelector("#feedback-list");

      results.sort((a, b) => parseInt(a.number) - parseInt(b.number));
      
      results.forEach(r => {
        const row = document.createElement("tr");
        row.className = "hover:bg-gray-50";
        row.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${r.number}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${r.user}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${r.accepted}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm ${r.correct ? 'text-green-600' : 'text-red-600'} font-bold">
            ${r.correct ? '✓ Correct' : '✗ Incorrect'}
          </td>
        `;
        feedbackList.appendChild(row);
      });

      resultSection.style.display = "block";
      
      // Call the new function here to mark answered questions
      markAnsweredQuestions(userAnswers);

    })
    .catch(error => {
      console.error("Error checking answers:", error);
      showCustomAlert("Error checking answers. Please try again.");
    });
}

function getBand(score) {
  if (score >= 39) return 9;
  if (score >= 37) return 8.5;
  if (score >= 35) return 8;
  if (score >= 32) return 7.5;
  if (score >= 30) return 7;
  if (score >= 26) return 6.5;
  if (score >= 23) return 6;
  if (score >= 18) return 5.5;
  if (score >= 16) return 5;
  if (score >= 13) return 4.5;
  if (score >= 10) return 4;
  return 3.5;
}

// Timer and window load logic moved here
let timeLeft = 60 * 60;
let timerInterval;

function startTimer() {
  timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
  timeLeft--;
  
  if (timeLeft <= 0) {
    clearInterval(timerInterval);
    document.getElementById('timer').textContent = "00:00";
    submitReading();
    return;
  }
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const timerDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  document.getElementById('timer').textContent = timerDisplay;
  
  const timerElement = document.getElementById('timer');
  timerElement.classList.remove('warning', 'critical');
  
  if (timeLeft <= 300) { /* 5 minutes */
    timerElement.classList.add('critical');
  } else if (timeLeft <= 900) { /* 15 minutes */
    timerElement.classList.add('warning');
  }
}

function goHome() {
  // Using a custom modal-like message instead of confirm
  const messageDiv = document.createElement("div");
  messageDiv.className = "fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center";
  messageDiv.innerHTML = `
    <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto text-center">
      <p class="text-lg font-semibold text-gray-800 mb-4">Are you sure you want to leave this page? Your progress will not be saved.</p>
      <button class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg mr-2" onclick="window.location.href = 'index.html'">Yes, Leave</button>
      <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg" onclick="this.closest('.fixed').remove()">No, Stay</button>
    </div>
  `;
  document.body.appendChild(messageDiv);
}

window.onload = function() {
  startTimer();
  loadReadingTest(); // This now handles attaching event listeners and initial marking
};

window.addEventListener('beforeunload', function() {
  clearInterval(timerInterval);
});