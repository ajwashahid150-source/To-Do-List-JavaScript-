/* =====================================================
   STATE
   The tasks array is the single source of truth.
   Every action updates this array FIRST, then the DOM
   is re-rendered to match it.
===================================================== */
let tasks = [];
let currentFilter = "all"; // "all" | "active" | "completed"
let nextId = 1;

/* =====================================================
   DOM REFERENCES
===================================================== */
const taskInput = document.querySelector("#taskInput");
const addTaskBtn = document.querySelector("#addTaskBtn");
const validationMsg = document.querySelector("#validationMsg");
const taskList = document.querySelector("#taskList");
const emptyState = document.querySelector("#emptyState");
const taskCounter = document.querySelector("#taskCounter");
const clearCompletedBtn = document.querySelector("#clearCompletedBtn");
const filterButtons = document.querySelectorAll(".filter-btn");

const statRemaining = document.querySelector("#statRemaining");
const statTotal = document.querySelector("#statTotal");
const statCompleted = document.querySelector("#statCompleted");
const statPercent = document.querySelector("#statPercent");
const ringProgress = document.querySelector("#ringProgress");

const RING_CIRCUMFERENCE = 213.6; // 2 * PI * r(34), matches CSS

/* =====================================================
   ADD TASK
===================================================== */
function addTask() {
  const text = taskInput.value.trim();

  // Prevent empty tasks and show a validation message instead
  if (text === "") {
    showValidationMessage("Please enter a task before adding it.");
    return;
  }

  // 1. Update the data first
  const newTask = {
    id: nextId++,
    text: text,
    completed: false,
  };
  tasks.push(newTask);

  // 2. Clear input and hide any validation message
  taskInput.value = "";
  hideValidationMessage();

  // 3. Re-render DOM based on the latest data
  renderTasks();
}

function showValidationMessage(message) {
  validationMsg.textContent = message;
  validationMsg.classList.add("is-visible");
}

function hideValidationMessage() {
  validationMsg.classList.remove("is-visible");
}

/* =====================================================
   CREATE A SINGLE TASK ELEMENT (DOM creation, no innerHTML)
===================================================== */
function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task-item";
  li.dataset.id = task.id;
  if (task.completed) {
    li.classList.add("is-completed");
  }

  // Checkbox
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Mark "${task.text}" as ${task.completed ? "active" : "completed"}`);
  checkbox.addEventListener("change", () => toggleTask(task.id));

  // Task text
  const span = document.createElement("span");
  span.className = "task-text";
  span.textContent = task.text;

  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "task-delete";
  deleteBtn.setAttribute("aria-label", `Delete "${task.text}"`);
  deleteBtn.addEventListener("click", () => deleteTask(task.id));

  const deleteIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  deleteIcon.setAttribute("width", "16");
  deleteIcon.setAttribute("height", "16");
  deleteIcon.setAttribute("viewBox", "0 0 16 16");
  deleteIcon.setAttribute("fill", "none");
  deleteIcon.setAttribute("aria-hidden", "true");

  const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  iconPath.setAttribute("d", "M3 4H13M6 4V2.5C6 2.22 6.22 2 6.5 2H9.5C9.78 2 10 2.22 10 2.5V4M12 4L11.5 13C11.47 13.55 11.02 14 10.47 14H5.53C4.98 14 4.53 13.55 4.5 13L4 4");
  iconPath.setAttribute("stroke", "currentColor");
  iconPath.setAttribute("stroke-width", "1.4");
  iconPath.setAttribute("stroke-linecap", "round");
  iconPath.setAttribute("stroke-linejoin", "round");

  deleteIcon.appendChild(iconPath);
  deleteBtn.appendChild(deleteIcon);

  // Assemble the task card
  li.appendChild(checkbox);
  li.appendChild(span);
  li.appendChild(deleteBtn);

  return li;
}

/* =====================================================
   TOGGLE TASK COMPLETION
===================================================== */
function toggleTask(id) {
  // 1. Update the data
  tasks = tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );

  // 2. Re-render to reflect the new state
  renderTasks();
}

/* =====================================================
   DELETE TASK (with fade/slide-out animation)
===================================================== */
function deleteTask(id) {
  const taskElement = taskList.querySelector(`[data-id="${id}"]`);

  const removeFromData = () => {
    // 1. Update the data array
    tasks = tasks.filter((task) => task.id !== id);
    // 2. Re-render based on updated data
    renderTasks();
  };

  if (taskElement) {
    taskElement.classList.add("is-removing");
    taskElement.addEventListener(
      "animationend",
      () => {
        removeFromData();
      },
      { once: true }
    );
  } else {
    removeFromData();
  }
}

/* =====================================================
   CLEAR COMPLETED
===================================================== */
function clearCompleted() {
  const hasCompleted = tasks.some((task) => task.completed);
  if (!hasCompleted) return;

  // 1. Update the data
  tasks = tasks.filter((task) => !task.completed);

  // 2. Re-render
  renderTasks();
}

/* =====================================================
   FILTER TASKS
   Returns a new array based on the currently selected filter.
===================================================== */
function filterTasks() {
  if (currentFilter === "active") {
    return tasks.filter((task) => !task.completed);
  }
  if (currentFilter === "completed") {
    return tasks.filter((task) => task.completed);
  }
  return tasks; // "all"
}

function setFilter(filter) {
  currentFilter = filter;

  // Update active state on the filter buttons
  filterButtons.forEach((btn) => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });

  renderTasks();
}

/* =====================================================
   RENDER TASKS
   Clears and rebuilds the task list from current data
   + the active filter. This is the single place the
   DOM is synchronized with the data array.
===================================================== */
function renderTasks() {
  // Clear the current list
  taskList.replaceChildren();

  const visibleTasks = filterTasks();

  if (visibleTasks.length === 0) {
    emptyState.classList.add("is-visible");
  } else {
    emptyState.classList.remove("is-visible");
    visibleTasks.forEach((task) => {
      const taskElement = createTaskElement(task);
      taskList.appendChild(taskElement);
    });
  }

  updateTaskCounter();
}

/* =====================================================
   UPDATE TASK COUNTER + STATS
===================================================== */
function updateTaskCounter() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const remaining = total - completed;

  // Main counter line
  if (total === 0) {
    taskCounter.textContent = "No tasks yet";
  } else if (remaining === 0) {
    taskCounter.textContent = "All tasks completed! 🎉";
  } else if (remaining === 1) {
    taskCounter.textContent = "1 task remaining";
  } else {
    taskCounter.textContent = `${remaining} tasks remaining`;
  }

  // Stat cards
  statRemaining.textContent = remaining;
  statTotal.textContent = total;
  statCompleted.textContent = completed;

  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  statPercent.textContent = `${percent}%`;

  // Animate the progress ring
  const offset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;
  ringProgress.style.strokeDashoffset = offset;

  // Disable "Clear Completed" gracefully when nothing to clear
  clearCompletedBtn.disabled = completed === 0;
}

/* =====================================================
   EVENT LISTENERS
===================================================== */
addTaskBtn.addEventListener("click", addTask);

taskInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addTask();
  }
});

taskInput.addEventListener("input", hideValidationMessage);

clearCompletedBtn.addEventListener("click", clearCompleted);

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => setFilter(btn.dataset.filter));
});

/* =====================================================
   INITIAL RENDER
===================================================== */
renderTasks();
