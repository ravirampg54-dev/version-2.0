const STORAGE_KEYS = {
  tasks: 'rpgTodoTasks',
  theme: 'rpgTodoTheme',
  settings: 'rpgTodoSettings',
};

const defaultCategories = [
  '📚 Study',
  '🎓 College',
  '💼 Work',
  '🏠 Personal',
  '📌 Other',
];

const defaultSettings = {
  remindersEnabled: true,
  defaultReminderMinutes: 30,
  defaultPriority: 'Medium',
  defaultCategory: '📚 Study',
  appVersion: '1.0.0',
};

let state = {
  tasks: [],
  activeNav: 'home',
  activeFilter: 'all',
  searchTerm: '',
  selectedTheme: 'theme-light',
  settings: {...defaultSettings},
};

const ui = {
  taskList: document.getElementById('taskList'),
  todayTasksList: document.getElementById('todayTasksList'),
  upcomingTasksList: document.getElementById('upcomingTasksList'),
  completedTaskList: document.getElementById('completedTaskList'),
  filterTabs: Array.from(document.querySelectorAll('.filter-chip')),
  navItems: Array.from(document.querySelectorAll('.nav-item')),
  screens: Array.from(document.querySelectorAll('.screen')),
  searchInput: document.getElementById('searchInput'),
  taskModal: document.getElementById('taskModal'),
  detailsModal: document.getElementById('detailsModal'),
  taskForm: document.getElementById('taskForm'),
  taskModalTitle: document.getElementById('taskModalTitle'),
  taskId: document.getElementById('taskId'),
  taskTitle: document.getElementById('taskTitle'),
  taskDescription: document.getElementById('taskDescription'),
  taskDueDate: document.getElementById('taskDueDate'),
  taskDueTime: document.getElementById('taskDueTime'),
  taskPriority: document.getElementById('taskPriority'),
  taskCategory: document.getElementById('taskCategory'),
  taskReminderEnabled: document.getElementById('taskReminderEnabled'),
  taskReminderDateTime: document.getElementById('taskReminderDateTime'),
  settingsDetail: document.getElementById('settingsDetail'),
  welcomeText: document.getElementById('welcomeText'),
  todayDate: document.getElementById('todayDate'),
  totalTasksStat: document.getElementById('totalTasksStat'),
  completedTasksStat: document.getElementById('completedTasksStat'),
  pendingTasksStat: document.getElementById('pendingTasksStat'),
  progressStat: document.getElementById('progressStat'),
  progressLabel: document.getElementById('progressLabel'),
  progressBar: document.getElementById('progressBar'),
  streakBadge: document.getElementById('streakBadge'),
  themeButton: document.getElementById('themeButton'),
  completedPanelCount: document.getElementById('completedPanelCount'),
  todayTasksCount: document.getElementById('todayTasksCount'),
  upcomingTasksCount: document.getElementById('upcomingTasksCount'),
};

const themeCycle = ['theme-light', 'theme-dark', 'theme-night', 'theme-blue', 'theme-sunset', 'theme-nature', 'theme-amoled'];

initialize();

function initialize() {
  loadSettings();
  loadTasks();
  hydrateCategorySelect();
  bindEvents();
  applyTheme(state.selectedTheme);
  renderApp();
  setTodayDate();
  updateWelcomeGreeting();
}

function bindEvents() {
  ui.searchInput.addEventListener('input', (event) => {
    state.searchTerm = event.target.value.trim().toLowerCase();
    renderTaskList();
  });

  ui.filterTabs.forEach((button) => {
    button.addEventListener('click', () => {
      state.activeFilter = button.dataset.filter;
      ui.filterTabs.forEach((chip) => chip.classList.toggle('active', chip === button));
      renderTaskList();
    });
  });

  ui.navItems.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.nav;
      if (target === 'add') {
        openTaskModal();
        return;
      }

      state.activeNav = target;
      ui.navItems.forEach((nav) => nav.classList.toggle('active', nav === button));
      renderScreens();
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      const modalId = button.dataset.closeModal;
      hideModal(modalId);
    });
  });

  ui.taskForm.addEventListener('submit', handleTaskSubmit);

  ui.taskReminderEnabled.addEventListener('change', () => {
    const isEnabled = ui.taskReminderEnabled.checked;
    document.querySelector('.reminder-field').classList.toggle('hidden', !isEnabled);
  });

  ui.themeButton.addEventListener('click', () => {
    cycleTheme();
  });

  document.querySelectorAll('[data-settings-action]').forEach((button) => {
    button.addEventListener('click', handleSettingsAction);
  });

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action="toggle-task"]');
    if (target) {
      const taskId = target.dataset.id;
      toggleTaskCompletion(taskId);
    }

    const viewButton = event.target.closest('.view-button');
    if (viewButton) {
      const card = viewButton.closest('.task-card');
      if (card) {
        openTaskDetails(card.dataset.taskId);
      }
    }

    const editButton = event.target.closest('.edit-button');
    if (editButton) {
      const card = editButton.closest('.task-card');
      if (card) {
        openTaskModal(card.dataset.taskId);
      }
    }

    const deleteButton = event.target.closest('.delete-button');
    if (deleteButton) {
      const card = deleteButton.closest('.task-card');
      if (card) {
        deleteTask(card.dataset.taskId);
      }
    }

    const completeToggle = event.target.closest('.complete-toggle');
    if (completeToggle) {
      const card = completeToggle.closest('.task-card');
      if (card) {
        toggleTaskCompletion(card.dataset.taskId);
      }
    }
  });
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.tasks);
    state.tasks = raw ? JSON.parse(raw) : [];
  } catch (error) {
    state.tasks = [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    state.settings = raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
  } catch (error) {
    state.settings = { ...defaultSettings };
  }

  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  state.selectedTheme = savedTheme || 'theme-light';
}

function saveTheme() {
  localStorage.setItem(STORAGE_KEYS.theme, state.selectedTheme);
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
}

function hydrateCategorySelect() {
  const categories = [...defaultCategories];
  const selected = state.settings.defaultCategory || defaultCategories[0];
  ui.taskCategory.innerHTML = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join('');
  ui.taskCategory.value = selected;
}

function setTodayDate() {
  ui.todayDate.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function updateWelcomeGreeting() {
  const hour = new Date().getHours();
  let message = 'Good Morning 👋';

  if (hour >= 12 && hour < 17) {
    message = 'Good Afternoon 👋';
  } else if (hour >= 17 && hour < 21) {
    message = 'Good Evening 👋';
  } else if (hour >= 21 || hour < 5) {
    message = 'Good Night 🌙';
  }

  ui.welcomeText.textContent = message;
}

function renderApp() {
  setTodayDate();
  updateWelcomeGreeting();
  renderStats();
  renderTaskList();
  renderCompletedList();
  renderScreens();
  renderSettingsDetail();
}

function renderSettingsDetail() {
  const detail = ui.settingsDetail;
  if (!detail) {
    return;
  }

  detail.classList.add('hidden');
  detail.innerHTML = '';
}

function renderScreens() {
  ui.screens.forEach((screen) => {
    screen.classList.toggle('active', screen.id === `${state.activeNav}View` || (state.activeNav === 'completed' && screen.id === 'completedView'));
  });
}

function renderStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  ui.totalTasksStat.textContent = total;
  ui.completedTasksStat.textContent = completed;
  ui.pendingTasksStat.textContent = pending;
  ui.progressStat.textContent = `${progress}%`;
  ui.progressLabel.textContent = `${progress}%`;
  ui.progressBar.style.width = `${progress}%`;
  ui.streakBadge.textContent = `🔥 ${getCurrentStreak()} Day Streak`;

  const todayDate = getLocalDateString(new Date());
  const todayCount = state.tasks.filter((task) => task.dueDate === todayDate && !task.completed).length;
  const upcomingCount = state.tasks.filter((task) => !task.completed && task.dueDate && task.dueDate > todayDate).length;

  ui.todayTasksCount.textContent = todayCount;
  ui.upcomingTasksCount.textContent = upcomingCount;
  ui.completedPanelCount.textContent = completed;

  renderDailySummaryLists();
}

function renderDailySummaryLists() {
  const todayDate = getLocalDateString(new Date());
  const todayTasks = state.tasks
    .filter((task) => task.dueDate === todayDate)
    .sort(sortTasks)
    .slice(0, 4);

  const upcomingTasks = state.tasks
    .filter((task) => !task.completed && task.dueDate && task.dueDate > todayDate)
    .sort(sortTasks)
    .slice(0, 4);

  ui.todayTasksList.innerHTML = todayTasks.length
    ? todayTasks.map(renderSummaryTaskCard).join('')
    : '<div class="empty-state">No tasks scheduled for today.</div>';

  ui.upcomingTasksList.innerHTML = upcomingTasks.length
    ? upcomingTasks.map(renderSummaryTaskCard).join('')
    : '<div class="empty-state">No upcoming tasks.</div>';
}

function renderSummaryTaskCard(task) {
  return `
    <div class="task-card ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
      <div class="task-main">
        <button class="complete-toggle" type="button" aria-label="Toggle completion">✓</button>
        <div class="task-copy">
          <div class="task-row">
            <h4 class="task-title">${escapeHtml(task.title)}</h4>
            <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
          </div>
          <div class="task-meta">
            <span class="meta-tag">${task.dueDate || 'No date'}</span>
            <span class="meta-tag">${task.category}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTaskList() {
  const filtered = getFilteredTasks();

  if (!filtered.length) {
    ui.taskList.innerHTML = '<div class="empty-state">No tasks match your filters.</div>';
    return;
  }

  ui.taskList.innerHTML = filtered
    .map((task) => {
      const description = task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : '';
      return `
        <article class="task-card ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
          <div class="task-main">
            <button class="complete-toggle" type="button" aria-label="Toggle completion">✓</button>
            <div class="task-copy">
              <div class="task-row">
                <h4 class="task-title">${escapeHtml(task.title)}</h4>
                <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
              </div>
              ${description}
              <div class="task-meta">
                <span class="meta-tag due-tag">${task.dueDate ? formatDate(task.dueDate) : 'No date'}</span>
                <span class="meta-tag category-tag">${task.category}</span>
              </div>
            </div>
          </div>
          <div class="task-actions">
            <button class="mini-button view-button" type="button">View</button>
            <button class="mini-button edit-button" type="button">Edit</button>
            <button class="mini-button delete-button" type="button">Delete</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderCompletedList() {
  const completed = state.tasks
    .filter((task) => task.completed)
    .sort(sortTasks);

  if (!completed.length) {
    ui.completedTaskList.innerHTML = '<div class="empty-state">No completed quests yet. Keep going!</div>';
    return;
  }

  ui.completedTaskList.innerHTML = completed
    .map((task) => `
      <article class="task-card completed" data-task-id="${task.id}">
        <div class="task-main">
          <button class="complete-toggle" type="button" aria-label="Toggle completion">✓</button>
          <div class="task-copy">
            <div class="task-row">
              <h4 class="task-title">${escapeHtml(task.title)}</h4>
              <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
            </div>
            <p class="task-description">${escapeHtml(task.description || 'No description')}</p>
            <div class="task-meta">
              <span class="meta-tag">${task.dueDate ? formatDate(task.dueDate) : 'No date'}</span>
              <span class="meta-tag">${task.category}</span>
            </div>
          </div>
        </div>
        <div class="task-actions">
          <button class="mini-button view-button" type="button">View</button>
          <button class="mini-button edit-button" type="button">Edit</button>
          <button class="mini-button delete-button" type="button">Delete</button>
        </div>
      </article>
    `)
    .join('');
}

function getFilteredTasks() {
  const today = getLocalDateString(new Date());
  const search = state.searchTerm;

  return [...state.tasks]
    .filter((task) => {
      const matchesSearch = !search || [task.title, task.description, task.category].some((value) =>
        String(value || '').toLowerCase().includes(search)
      );

      if (!matchesSearch) {
        return false;
      }

      switch (state.activeFilter) {
        case 'today':
          return task.dueDate === today;
        case 'upcoming':
          return !task.completed && task.dueDate && task.dueDate > today;
        case 'completed':
          return task.completed;
        case 'high':
          return task.priority === 'High';
        default:
          return true;
      }
    })
    .sort(sortTasks);
}

function sortTasks(a, b) {
  if (a.completed !== b.completed) {
    return Number(a.completed) - Number(b.completed);
  }

  const aDate = a.dueDate || '9999-12-31';
  const bDate = b.dueDate || '9999-12-31';
  if (aDate !== bDate) {
    return aDate.localeCompare(bDate);
  }

  const priorityRank = { High: 3, Medium: 2, Low: 1 };
  if (priorityRank[a.priority] !== priorityRank[b.priority]) {
    return priorityRank[b.priority] - priorityRank[a.priority];
  }

  return new Date(b.createdAt) - new Date(a.createdAt);
}

function openTaskModal(taskId = null) {
  ui.taskForm.reset();
  ui.taskCategory.innerHTML = defaultCategories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join('');
  ui.taskCategory.value = state.settings.defaultCategory || defaultCategories[0];
  ui.taskPriority.value = state.settings.defaultPriority || 'Medium';
  ui.taskReminderEnabled.checked = true;
  document.querySelector('.reminder-field').classList.remove('hidden');

  if (taskId) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }

    ui.taskModalTitle.textContent = 'Edit Task';
    ui.taskId.value = task.id;
    ui.taskTitle.value = task.title;
    ui.taskDescription.value = task.description || '';
    ui.taskDueDate.value = task.dueDate || '';
    ui.taskDueTime.value = task.dueTime || '';
    ui.taskPriority.value = task.priority || 'Medium';
    ui.taskCategory.value = task.category || state.settings.defaultCategory;
    ui.taskReminderEnabled.checked = Boolean(task.reminderEnabled);
    ui.taskReminderDateTime.value = task.reminderDateTime || '';
    document.querySelector('.reminder-field').classList.toggle('hidden', !task.reminderEnabled);
  } else {
    ui.taskModalTitle.textContent = 'Add Task';
    ui.taskId.value = '';
    ui.taskTitle.value = '';
    ui.taskDescription.value = '';
    ui.taskDueDate.value = '';
    ui.taskDueTime.value = '';
    ui.taskReminderDateTime.value = '';
  }

  showModal('taskModal');
}

function handleTaskSubmit(event) {
  event.preventDefault();

  const title = ui.taskTitle.value.trim();
  if (!title) {
    ui.taskTitle.focus();
    return;
  }

  const id = ui.taskId.value || createId();
  const now = new Date().toISOString();
  const reminderEnabled = ui.taskReminderEnabled.checked;

  const task = {
    id,
    title,
    description: ui.taskDescription.value.trim(),
    dueDate: ui.taskDueDate.value || '',
    dueTime: ui.taskDueTime.value || '',
    priority: ui.taskPriority.value,
    category: ui.taskCategory.value,
    reminderEnabled,
    reminderDateTime: reminderEnabled ? (ui.taskReminderDateTime.value || calculateReminderDateTime(ui.taskDueDate.value, ui.taskDueTime.value)) : '',
    completed: false,
    completedAt: null,
    createdAt: existingTask(id)?.createdAt || now,
    updatedAt: now,
  };

  const existingIndex = state.tasks.findIndex((item) => item.id === id);
  if (existingIndex >= 0) {
    const current = state.tasks[existingIndex];
    task.completed = current.completed;
    task.completedAt = current.completedAt;
    task.createdAt = current.createdAt;
    state.tasks[existingIndex] = task;
  } else {
    state.tasks.push(task);
  }

  state.settings.defaultPriority = ui.taskPriority.value;
  state.settings.defaultCategory = ui.taskCategory.value;
  saveSettings();
  saveTasks();
  hideModal('taskModal');
  renderApp();
}

function existingTask(id) {
  return state.tasks.find((task) => task.id === id);
}

function calculateReminderDateTime(dateValue, timeValue) {
  if (!dateValue) {
    const today = new Date();
    const nextDate = new Date(today);
    nextDate.setMinutes(nextDate.getMinutes() + 30);
    return nextDate.toISOString().slice(0, 16);
  }

  const datePart = dateValue;
  const timePart = timeValue || '09:00';
  return `${datePart}T${timePart}`;
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  saveTasks();
  renderApp();
}

function toggleTaskCompletion(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }

  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;
  task.updatedAt = new Date().toISOString();
  saveTasks();
  renderApp();
}

function openTaskDetails(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }

  ui.settingsDetail.innerHTML = '';
  ui.settingsDetail.classList.add('hidden');
  document.getElementById('taskDetailsContent').innerHTML = `
    <div class="detail-item">
      <span>Title</span>
      <strong>${escapeHtml(task.title)}</strong>
    </div>
    <div class="detail-item">
      <span>Description</span>
      <strong>${escapeHtml(task.description || 'No description')}</strong>
    </div>
    <div class="detail-item">
      <span>Due Date</span>
      <strong>${task.dueDate ? formatDate(task.dueDate) : 'No due date'}</strong>
    </div>
    <div class="detail-item">
      <span>Due Time</span>
      <strong>${task.dueTime || 'No due time'}</strong>
    </div>
    <div class="detail-item">
      <span>Priority</span>
      <strong>${task.priority}</strong>
    </div>
    <div class="detail-item">
      <span>Category</span>
      <strong>${task.category}</strong>
    </div>
    <div class="detail-item">
      <span>Reminder</span>
      <strong>${task.reminderEnabled ? `Enabled (${task.reminderDateTime || 'No date set'})` : 'Disabled'}</strong>
    </div>
    <div class="detail-item">
      <span>Created Date</span>
      <strong>${task.createdAt ? new Date(task.createdAt).toLocaleString() : 'Unknown'}</strong>
    </div>
    <div class="detail-item">
      <span>Completion Status</span>
      <strong>${task.completed ? 'Completed' : 'Pending'}</strong>
    </div>
  `;

  showModal('detailsModal');
}

function handleSettingsAction(event) {
  const action = event.currentTarget.dataset.settingsAction;
  const detail = ui.settingsDetail;

  switch (action) {
    case 'theme-center':
      detail.classList.remove('hidden');
      detail.innerHTML = `
        <div class="theme-grid">
          ${themeCycle.map((theme) => buildThemeOption(theme)).join('')}
        </div>
      `;
      bindThemeSelection();
      break;
    case 'reminder-settings':
      detail.classList.remove('hidden');
      detail.innerHTML = `
        <div class="field-group">
          <label>Reminders</label>
          <label class="switch">
            <input id="reminderToggle" type="checkbox" ${state.settings.remindersEnabled ? 'checked' : ''} />
            <span class="slider"></span>
          </label>
        </div>
        <div class="field-group">
          <label for="defaultReminderTime">Default reminder time</label>
          <input id="defaultReminderTime" type="number" min="5" max="1440" step="5" value="${state.settings.defaultReminderMinutes || 30}" />
        </div>
        <div class="modal-actions">
          <button type="button" class="primary-btn" id="saveReminderSettings">Save</button>
        </div>
      `;
      document.getElementById('saveReminderSettings').addEventListener('click', () => {
        state.settings.remindersEnabled = document.getElementById('reminderToggle').checked;
        state.settings.defaultReminderMinutes = Number(document.getElementById('defaultReminderTime').value || 30);
        saveSettings();
        detail.classList.add('hidden');
      });
      break;
    case 'default-priority':
      detail.classList.remove('hidden');
      detail.innerHTML = `
        <div class="field-group">
          <label for="defaultPriorityInput">Default Priority</label>
          <select id="defaultPriorityInput">
            <option value="Low" ${state.settings.defaultPriority === 'Low' ? 'selected' : ''}>Low</option>
            <option value="Medium" ${state.settings.defaultPriority === 'Medium' ? 'selected' : ''}>Medium</option>
            <option value="High" ${state.settings.defaultPriority === 'High' ? 'selected' : ''}>High</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="primary-btn" id="saveDefaultPriority">Save</button>
        </div>
      `;
      document.getElementById('saveDefaultPriority').addEventListener('click', () => {
        state.settings.defaultPriority = document.getElementById('defaultPriorityInput').value;
        saveSettings();
        detail.classList.add('hidden');
      });
      break;
    case 'default-category':
      detail.classList.remove('hidden');
      detail.innerHTML = `
        <div class="field-group">
          <label for="defaultCategoryInput">Default Category</label>
          <select id="defaultCategoryInput">
            ${defaultCategories.map((category) => `<option value="${category}" ${state.settings.defaultCategory === category ? 'selected' : ''}>${category}</option>`).join('')}
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="primary-btn" id="saveDefaultCategory">Save</button>
        </div>
      `;
      document.getElementById('saveDefaultCategory').addEventListener('click', () => {
        state.settings.defaultCategory = document.getElementById('defaultCategoryInput').value;
        saveSettings();
        detail.classList.add('hidden');
      });
      break;
    case 'export-tasks':
      exportTasks();
      break;
    case 'import-tasks':
      importTasks();
      break;
    case 'clear-tasks':
      if (confirm('Clear all tasks? This action cannot be undone.')) {
        state.tasks = [];
        saveTasks();
        renderApp();
      }
      break;
    case 'app-version':
      detail.classList.remove('hidden');
      detail.innerHTML = `
        <div class="detail-item">
          <span>App Version</span>
          <strong>${state.settings.appVersion}</strong>
        </div>
      `;
      break;
    case 'about-rpg':
      detail.classList.remove('hidden');
      detail.innerHTML = `
        <div class="detail-item">
          <span>About RPG Todo</span>
          <strong>Offline productivity for study, work, and daily quests.</strong>
        </div>
      `;
      break;
    default:
      detail.classList.add('hidden');
  }
}

function buildThemeOption(themeName) {
  const themeMap = {
    'theme-light': { label: 'Light Mode', text: 'Clean & bright', preview: 'linear-gradient(135deg, #fff, #dfeaff)' },
    'theme-dark': { label: 'Dark Mode', text: 'Comfortable dark interface', preview: 'linear-gradient(135deg, #1d2b3a, #0b1220)' },
    'theme-night': { label: 'Night Reading Mode', text: 'Warm study-friendly tones', preview: 'linear-gradient(135deg, #2b241d, #1b1611)' },
    'theme-blue': { label: 'Blue Mode', text: 'Modern technology theme', preview: 'linear-gradient(135deg, #dfeeff, #cfe2ff)' },
    'theme-sunset': { label: 'Sunset Mode', text: 'Warm evening colors', preview: 'linear-gradient(135deg, #ffd7c2, #f7b7a0)' },
    'theme-nature': { label: 'Nature Mode', text: 'Calm green theme', preview: 'linear-gradient(135deg, #dff7ea, #bfe9d3)' },
    'theme-amoled': { label: 'AMOLED Mode', text: 'Pure black interface', preview: 'linear-gradient(135deg, #111, #000)' },
  };

  const current = themeMap[themeName];
  const isSelected = state.selectedTheme === themeName;
  return `
    <button class="theme-option ${isSelected ? 'selected' : ''}" type="button" data-theme-option="${themeName}">
      <div>
        <strong>${current.label}</strong>
        <small>${current.text}</small>
      </div>
      <div class="theme-preview" style="background:${current.preview};"></div>
      <span class="theme-check">${isSelected ? '✓' : ''}</span>
    </button>
  `;
}

function bindThemeSelection() {
  document.querySelectorAll('[data-theme-option]').forEach((button) => {
    button.addEventListener('click', () => {
      const chosen = button.dataset.themeOption;
      state.selectedTheme = chosen;
      applyTheme(chosen);
      saveTheme();
      renderSettingsDetailQuick();
    });
  });
}

function renderSettingsDetailQuick() {
  const detail = ui.settingsDetail;
  if (!detail || detail.classList.contains('hidden')) {
    return;
  }

  detail.innerHTML = `
    <div class="theme-grid">
      ${themeCycle.map((theme) => buildThemeOption(theme)).join('')}
    </div>
  `;
  bindThemeSelection();
}

function applyTheme(themeName) {
  document.body.classList.remove('theme-light', 'theme-dark', 'theme-night', 'theme-blue', 'theme-sunset', 'theme-nature', 'theme-amoled');
  document.body.classList.add(themeName);

  const themeIconMap = {
    'theme-light': '☀️',
    'theme-dark': '🌙',
    'theme-night': '📖',
    'theme-blue': '🔵',
    'theme-sunset': '🌅',
    'theme-nature': '🌿',
    'theme-amoled': '⚫',
  };

  ui.themeButton.textContent = themeIconMap[themeName] || '🌙';
}

function cycleTheme() {
  const currentIndex = themeCycle.indexOf(state.selectedTheme);
  const nextIndex = (currentIndex + 1) % themeCycle.length;
  state.selectedTheme = themeCycle[nextIndex];
  applyTheme(state.selectedTheme);
  saveTheme();
}

function exportTasks() {
  const content = JSON.stringify(state.tasks, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'rpg-todo-tasks.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importTasks() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid task export');
        }
        state.tasks = parsed;
        saveTasks();
        renderApp();
      } catch (error) {
        alert('Import failed. Please choose a valid RPG Todo JSON export.');
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    return;
  }
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    return;
  }
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function createId() {
  return `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getCurrentStreak() {
  const completedDates = new Set(
    state.tasks
      .filter((task) => task.completed && task.completedAt)
      .map((task) => getLocalDateString(new Date(task.completedAt)))
  );

  if (!completedDates.size) {
    return 0;
  }

  const today = new Date();
  let streak = 0;
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  while (true) {
    const d = getLocalDateString(cursor);
    if (completedDates.has(d)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (streak > 0) {
      break;
    }

    const previousDay = new Date(cursor);
    previousDay.setDate(previousDay.getDate() - 1);
    if (completedDates.has(getLocalDateString(previousDay))) {
      streak += 1;
      cursor = previousDay;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }

  return streak;
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) {
    return 'No date';
  }

  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
