const params = new URLSearchParams(window.location.search);
const studentName = params.get("name") || localStorage.getItem("studentName");
const test = params.get("test") || localStorage.getItem("selectedTest");

const passageDiv = document.getElementById("passage-section");
const questionDiv = document.getElementById("question-section");
const studentInfo = document.getElementById("student-info");

if (!studentName || !test) {
  alert("Missing name or test. Redirecting to home...");
  window.location.href = "index.html";
}

studentInfo.textContent = `Student: ${studentName} | Test: ${test.toUpperCase()}`;

fetch(`tests/${test}/reading.json?t=${Date.now()}`)
  .then(res => res.json())
  .then(data => {
    passageDiv.innerHTML = "";
    data.passages.forEach((passage, idx) => {
      const passageBlock = document.createElement("div");
      
      
      const paragraphs = passage.text.split('\n\n')
        .map(p => `<p style="margin-bottom: 1.5em; line-height: 1.8;">${p}</p>`)
        .join('');
  
      passageBlock.innerHTML = `
        <h2 style="margin-bottom: 1em;">Passage ${idx + 1}: ${passage.title}</h2>
        ${paragraphs}
      `;
      
      passageBlock.style.marginBottom = "2em";
      passageDiv.appendChild(passageBlock);

      passage.questions.forEach(group => {
        const block = document.createElement("div");
        block.className = "question-block";
        const title = document.createElement("h3");
        title.textContent = group.title || group.group_type;
        title.style.marginBottom = "1em";
        block.appendChild(title);

        if (group.instruction) {
          const instruction = document.createElement("p");
          instruction.innerHTML = group.instruction.replace(/\n/g, '<br>');
          instruction.style.marginBottom = "1em";
          instruction.style.fontStyle = "italic";
          block.appendChild(instruction);
        }

        if (group.image) {
            const imageContainer = document.createElement("div");
            imageContainer.style.textAlign = "center";
            imageContainer.style.marginBottom = "1.5em";
            const img = document.createElement("img");
            img.src = `tests/${test}/${group.image}`; 
            img.alt = `Diagram for ${group.group_type}`;
            img.style.maxWidth = "100%";
            img.style.height = "auto";
            img.style.borderRadius = "8px"; 
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
          qDiv.style.marginBottom = "1.5em";
          const number = q.number;
          const prompt = q.prompt || "";
          const name = `q${number}`;

          
          if (q.input_type === "checkbox") {
            qDiv.innerHTML = `<strong style="display: block; margin-bottom: 0.5em;">${number}. ${prompt}</strong>`;
            const maxChoices = typeof q.max_choices === 'number' ? q.max_choices : 1;
            
            
            q.options.forEach((opt, idx) => {
              const optionLetter = String.fromCharCode(65 + idx);
              qDiv.innerHTML += `
                <label style="display: block; margin-bottom: 8px;">
                  <input type="checkbox" name="${name}${optionLetter}" value="${optionLetter}" style="margin-right: 8px;">
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
                alert(`You can select at most ${maxChoices} options.`);
              }
              });
            });
            }
          else if (group.group_type === "True/False/Not Given" || q.question_type === "true_false_not_given") {
            qDiv.innerHTML = `<strong style="display: block; margin-bottom: 0.5em;">${number}. ${prompt}</strong>`;
            ["TRUE", "FALSE", "NOT GIVEN"].forEach(opt => {
              qDiv.innerHTML += `
                <label style="display: inline-block; margin-right: 15px; margin-bottom: 8px;">
                  <input type="radio" name="${name}" value="${opt}" style="margin-right: 5px;">
                  ${opt}
                </label>
              `;
            });
          } else if (group.group_type === "Yes/No/Not Given" || q.question_type === "yes_no_not_given") {
            qDiv.innerHTML = `<strong style="display: block; margin-bottom: 0.5em;">${number}. ${prompt}</strong>`;
            ["YES", "NO", "NOT GIVEN"].forEach(opt => {
              qDiv.innerHTML += `
                <label style="display: inline-block; margin-right: 15px; margin-bottom: 8px;">
                  <input type="radio" name="${name}" value="${opt}" style="margin-right: 5px;">
                  ${opt}
                </label>
              `;
            });
          } else if (group.group_type === "Multiple Choice" || q.question_type === "multiple_choice") {
            qDiv.innerHTML = `<strong style="display: block; margin-bottom: 0.5em;">${number}. ${prompt}</strong>`;
            q.options.forEach((opt, idx) => {
              const optionLetter = String.fromCharCode(65 + idx);
              qDiv.innerHTML += `
                <label style="display: block; margin-bottom: 8px;">
                  <input type="radio" name="${name}" value="${optionLetter}" style="margin-right: 8px;">
                  ${optionLetter}. ${opt}
                </label>
              `;
            });
          } else if (group.group_type === "Matching Headings" || q.question_type === "matching_headings") {
            const options = q.options || [];
            const dropdown = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
            qDiv.innerHTML = `
              <label style="display: block; margin-bottom: 0.5em;">${number}. ${prompt}</label>
              <select name="${name}" style="width: 100%; padding: 8px;">
                <option value="">-- Select Heading --</option>
                ${dropdown}
              </select>
            `;
          } else if (group.group_type === "Matching Sentence Endings" || q.question_type === "matching_sentence_endings") {
            const options = q.options || [];
            const dropdown = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
            qDiv.innerHTML = `
              <label style="display: block; margin-bottom: 0.5em;">${number}. ${prompt}</label>
              <select name="${name}" style="width: 100%; padding: 8px;">
                <option value="">-- Select Ending --</option>
                ${dropdown}
              </select>
            `;
            } else if (q.input_type === "dropdown") {
            const options = q.options || [];
            const dropdown = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
            qDiv.innerHTML = `
              <label style="display: block; margin-bottom: 0.5em;">${number}. ${prompt}</label>
              <select name="${name}" style="width: 100%; padding: 8px;">
              <option value="">-- Select --</option>
              ${dropdown}
              </select>
            `;
            } else {
            qDiv.innerHTML = `
              <label style="display: block; margin-bottom: 0.5em;">${number}. ${prompt}</label>
              <input type="text" name="${name}" style="width: 100%; padding: 8px; margin-bottom: 1em;">
            `;
          }
          block.appendChild(qDiv);
        });

        questionDiv.appendChild(block);
      });
    });
  })
  .catch(error => {
    console.error("Error loading test:", error);
    showCustomAlert("Error loading test. Please try again.");
  });

function submitReading() {
  const resultSection = document.getElementById("result-section");
  resultSection.style.display = "none";
  const oldFeedback = resultSection.querySelector("div");
  if (oldFeedback) oldFeedback.remove();

  const formElements = document.getElementById("reading-form").elements;
  const userAnswers = {};

  for (let i = 0; i < formElements.length; i++) {
    const element = formElements[i];
    if (element.name && element.name.startsWith("q")) {
      const qnum = element.name.replace("q", "");
      
      if (!userAnswers[qnum]) userAnswers[qnum] = [];
      
      if (element.type === "radio" && element.checked) {
        userAnswers[qnum].push(element.value);
      } 
      else if (element.type === "checkbox" && element.checked) {
        userAnswers[qnum].push(element.value);
      }
      else if (element.tagName === "SELECT" && element.value) {
        userAnswers[qnum].push(element.value);
      } else if (element.type === "text" && element.value.trim()) {
        userAnswers[qnum].push(element.value.trim());
      }
    }
  }

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
        
        if (q.accepted.length > 1) {
          if (normalizedUser.length !== normalizedAccepted.length) {
            isCorrect = false;
          } else {
            isCorrect = normalizedUser.every(u => normalizedAccepted.includes(u));
          }
        } 

        else {
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
        <h3 style="margin-bottom: 1em;">Answer Feedback</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; margin-bottom: 1.5em;">
          <thead>
            <tr>
              <th>Question</th>
              <th>Your Answer</th>
              <th>Accepted Answers</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="feedback-list"></tbody>
        </table>
      `;
      
      resultSection.appendChild(feedback);
      const feedbackList = feedback.querySelector("#feedback-list");

      results.sort((a, b) => parseInt(a.number) - parseInt(b.number));
      
      results.forEach(r => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${r.number}</td>
          <td>${r.user}</td>
          <td>${r.accepted}</td>
          <td style="color: ${r.correct ? 'green' : 'red'}; font-weight: bold;">
            ${r.correct ? '✓ Correct' : '✗ Incorrect'}
          </td>
        `;
        feedbackList.appendChild(row);
      });

      resultSection.style.display = "block";
    })
    .catch(error => {
      console.error("Error checking answers:", error);
      alert("Error checking answers. Please try again.");
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