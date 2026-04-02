const STORAGE_KEY = "taskflow-workspace-tasks";

const sampleTasks = [
  {
    id: generateId(),
    title: "Map the launch checklist",
    description: "Outline the final launch steps, assign owners, and confirm handoff timing.",
    dueDate: new Date().toISOString().slice(0, 10),
    priority: "high",
    status: "in-progress",
    createdAt: Date.now() - 1000 * 60 * 60 * 10
  },
  {
    id: generateId(),
    title: "Clean up backlog labels",
    description: "Archive stale ideas and tag the tickets that need follow-up this week.",
    dueDate: "",
    priority: "medium",
    status: "todo",
    createdAt: Date.now() - 1000 * 60 * 60 * 28
  },
  {
    id: generateId(),
    title: "Share stakeholder recap",
    description: "Send the weekly summary with risks, wins, and the next milestone.",
    dueDate: "",
    priority: "low",
    status: "done",
    createdAt: Date.now() - 1000 * 60 * 60 * 52
  }
];

const state = {
  tasks: loadTasks(),
  editingTaskId: null,
  filters: {
    search: "",
    status: "all",
    priority: "all",
    sortBy: "dueDate"
  }
};

const elements = {
  taskForm: document.querySelector("#taskForm"),
  taskTitle: document.querySelector("#taskTitle"),
  taskDescription: document.querySelector("#taskDescription"),
  taskDueDate: document.querySelector("#taskDueDate"),
  taskPriority: document.querySelector("#taskPriority"),
  taskStatus: document.querySelector("#taskStatus"),
  submitButton: document.querySelector("#submitButton"),
  clearFormButton: document.querySelector("#clearFormButton"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  priorityFilter: document.querySelector("#priorityFilter"),
  sortBy: document.querySelector("#sortBy"),
  taskList: document.querySelector("#taskList"),
  taskCardTemplate: document.querySelector("#taskCardTemplate"),
  totalTasks: document.querySelector("#totalTasks"),
  tasksToday: document.querySelector("#tasksToday"),
  completionRate: document.querySelector("#completionRate"),
  inProgressCount: document.querySelector("#inProgressCount"),
  highPriorityCount: document.querySelector("#highPriorityCount"),
  doneCount: document.querySelector("#doneCount"),
  focusTitle: document.querySelector("#focusTitle"),
  focusDescription: document.querySelector("#focusDescription"),
  focusBadge: document.querySelector("#focusBadge"),
  focusDue: document.querySelector("#focusDue")
};

bindEvents();
render();

function bindEvents() {
  elements.taskForm.addEventListener("submit", handleFormSubmit);
  elements.clearFormButton.addEventListener("click", resetForm);

  elements.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    render();
  });

  elements.statusFilter.addEventListener("change", (event) => {
    state.filters.status = event.target.value;
    render();
  });

  elements.priorityFilter.addEventListener("change", (event) => {
    state.filters.priority = event.target.value;
    render();
  });

  elements.sortBy.addEventListener("change", (event) => {
    state.filters.sortBy = event.target.value;
    render();
  });

  elements.taskList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-task-id]");

    if (!card) {
      return;
    }

    const { taskId } = card.dataset;

    if (event.target.classList.contains("edit-button")) {
      startEditing(taskId);
    }

    if (event.target.classList.contains("delete-button")) {
      deleteTask(taskId);
    }
  });

  elements.taskList.addEventListener("change", (event) => {
    if (!event.target.classList.contains("task-complete")) {
      return;
    }

    const card = event.target.closest("[data-task-id]");

    if (!card) {
      return;
    }

    toggleTaskComplete(card.dataset.taskId, event.target.checked);
  });
}

function handleFormSubmit(event) {
  event.preventDefault();

  const title = elements.taskTitle.value.trim();

  if (!title) {
    elements.taskTitle.focus();
    return;
  }

  const task = {
    id: state.editingTaskId ?? generateId(),
    title,
    description: elements.taskDescription.value.trim(),
    dueDate: elements.taskDueDate.value,
    priority: elements.taskPriority.value,
    status: elements.taskStatus.value,
    createdAt: state.editingTaskId ? getTaskById(state.editingTaskId).createdAt : Date.now()
  };

  if (state.editingTaskId) {
    state.tasks = state.tasks.map((item) => item.id === state.editingTaskId ? task : item);
  } else {
    state.tasks = [task, ...state.tasks];
  }

  persistTasks();
  resetForm();
  render();
}

function startEditing(taskId) {
  const task = getTaskById(taskId);

  if (!task) {
    return;
  }

  state.editingTaskId = taskId;
  elements.taskTitle.value = task.title;
  elements.taskDescription.value = task.description;
  elements.taskDueDate.value = task.dueDate;
  elements.taskPriority.value = task.priority;
  elements.taskStatus.value = task.status;
  elements.submitButton.textContent = "Update task";
  elements.clearFormButton.hidden = false;
  elements.taskTitle.focus();
}

function resetForm() {
  state.editingTaskId = null;
  elements.taskForm.reset();
  elements.taskPriority.value = "medium";
  elements.taskStatus.value = "todo";
  elements.submitButton.textContent = "Save task";
  elements.clearFormButton.hidden = true;
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);

  if (state.editingTaskId === taskId) {
    resetForm();
  }

  persistTasks();
  render();
}

function toggleTaskComplete(taskId, isComplete) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    return {
      ...task,
      status: isComplete ? "done" : "todo"
    };
  });

  if (state.editingTaskId === taskId) {
    const updatedTask = getTaskById(taskId);
    elements.taskStatus.value = updatedTask.status;
  }

  persistTasks();
  render();
}

function render() {
  renderTaskList();
  renderInsights();
  renderFocusCard();
}

function renderTaskList() {
  const tasks = getVisibleTasks();

  elements.taskList.innerHTML = "";

  if (tasks.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = `
      <h3>No tasks match this view yet.</h3>
      <p>Try changing a filter or add a new task to get momentum back.</p>
    `;
    elements.taskList.append(emptyState);
    return;
  }

  tasks.forEach((task) => {
    const fragment = elements.taskCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".task-card");
    const completeToggle = fragment.querySelector(".task-complete");

    card.dataset.taskId = task.id;
    card.classList.toggle("is-done", task.status === "done");

    fragment.querySelector(".task-priority").textContent = capitalize(task.priority);
    fragment.querySelector(".task-priority").dataset.priority = task.priority;
    fragment.querySelector(".task-status").textContent = formatStatus(task.status);
    fragment.querySelector(".task-title").textContent = task.title;
    fragment.querySelector(".task-description").textContent = task.description || "No extra details added.";
    fragment.querySelector(".task-due").textContent = task.dueDate
      ? `Due ${formatDate(task.dueDate)}`
      : "No due date";
    fragment.querySelector(".task-created").textContent = `Created ${formatRelativeDate(task.createdAt)}`;

    completeToggle.checked = task.status === "done";

    elements.taskList.append(fragment);
  });
}

function renderInsights() {
  const totalTasks = state.tasks.length;
  const dueToday = state.tasks.filter((task) => task.dueDate === todayKey()).length;
  const inProgress = state.tasks.filter((task) => task.status === "in-progress").length;
  const highPriority = state.tasks.filter((task) => task.priority === "high").length;
  const done = state.tasks.filter((task) => task.status === "done").length;
  const completionRate = totalTasks ? Math.round((done / totalTasks) * 100) : 0;

  elements.totalTasks.textContent = String(totalTasks);
  elements.tasksToday.textContent = String(dueToday);
  elements.completionRate.textContent = `${completionRate}%`;
  elements.inProgressCount.textContent = String(inProgress);
  elements.highPriorityCount.textContent = String(highPriority);
  elements.doneCount.textContent = String(done);
}

function renderFocusCard() {
  const focusTask = [...state.tasks]
    .filter((task) => task.priority === "high" && task.status !== "done")
    .sort((left, right) => compareTasks(left, right, "dueDate"))[0];

  if (!focusTask) {
    elements.focusTitle.textContent = "No priority task yet";
    elements.focusDescription.textContent = "Add a high-priority task to surface your next best move.";
    elements.focusBadge.textContent = "Waiting for input";
    elements.focusDue.textContent = "No due date";
    return;
  }

  elements.focusTitle.textContent = focusTask.title;
  elements.focusDescription.textContent = focusTask.description || "This task does not have extra notes yet.";
  elements.focusBadge.textContent = formatStatus(focusTask.status);
  elements.focusDue.textContent = focusTask.dueDate ? `Due ${formatDate(focusTask.dueDate)}` : "No due date";
}

function getVisibleTasks() {
  return [...state.tasks]
    .filter((task) => {
      const matchesSearch = !state.filters.search
        || `${task.title} ${task.description}`.toLowerCase().includes(state.filters.search);
      const matchesStatus = state.filters.status === "all" || task.status === state.filters.status;
      const matchesPriority = state.filters.priority === "all" || task.priority === state.filters.priority;
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((left, right) => compareTasks(left, right, state.filters.sortBy));
}

function compareTasks(left, right, sortBy) {
  if (sortBy === "priority") {
    return priorityWeight(left.priority) - priorityWeight(right.priority);
  }

  if (sortBy === "createdAt") {
    return right.createdAt - left.createdAt;
  }

  if (sortBy === "status") {
    return statusWeight(left.status) - statusWeight(right.status);
  }

  const leftDate = left.dueDate ? new Date(left.dueDate).getTime() : Number.POSITIVE_INFINITY;
  const rightDate = right.dueDate ? new Date(right.dueDate).getTime() : Number.POSITIVE_INFINITY;
  return leftDate - rightDate;
}

function priorityWeight(priority) {
  return {
    high: 0,
    medium: 1,
    low: 2
  }[priority];
}

function statusWeight(status) {
  return {
    "in-progress": 0,
    todo: 1,
    done: 2
  }[status];
}

function loadTasks() {
  try {
    const rawTasks = localStorage.getItem(STORAGE_KEY);
    return rawTasks ? JSON.parse(rawTasks) : sampleTasks;
  } catch (error) {
    return sampleTasks;
  }
}

function persistTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function generateId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTaskById(taskId) {
  return state.tasks.find((task) => task.id === taskId);
}

function formatStatus(status) {
  return status === "in-progress" ? "In progress" : capitalize(status);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatRelativeDate(timestamp) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.max(0, Math.floor((Date.now() - timestamp) / msPerDay));

  if (diff === 0) {
    return "today";
  }

  if (diff === 1) {
    return "1 day ago";
  }

  return `${diff} days ago`;
}

function todayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
