const STORAGE_KEYS = {
  tasks: 'rpgTodoTasks',
  notes: 'rpgTodoNotes',
  alarms: 'rpgTodoAlarms',
  timer: 'rpgTodoTimer',
  theme: 'rpgTodoTheme',
  settings: 'rpgTodoSettings',
  firedAlarms: 'rpgTodoFiredAlarms',
};

const INSTALL_DISMISSED_KEY = 'rpgTodoInstallDismissed';

const APP_VERSION = '2.0.0';

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
  soundEnabled: true,
  soundVolume: 70,
  soundTone: 'alarm',
  noteColor: '#ffffff',
  appVersion: APP_VERSION,
};

const NOTE_COLORS = ['#ffffff', '#fff3c4', '#ffe0e0', '#e3f7e8', '#e0ecff', '#f0e6ff', '#ffe6f5'];

const REPEAT_LABELS = {
  never: 'Once',
  daily: 'Every day',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
  custom: '',
};

const DAY_LABELS = [
  { short: 'Sun', long: 'Sunday' },
  { short: 'Mon', long: 'Monday' },
  { short: 'Tue', long: 'Tuesday' },
  { short: 'Wed', long: 'Wednesday' },
  { short: 'Thu', long: 'Thursday' },
  { short: 'Fri', long: 'Friday' },
  { short: 'Sat', long: 'Saturday' },
];

const priorities = ['Low', 'Medium', 'High'];

let state = {
  tasks: [],
  notes: [],
  alarms: [],
  activeNav: 'home',
  activeFilter: 'all',
  activeNoteFilter: 'all',
  searchTerm: '',
  noteSearchTerm: '',
  selectedTheme: 'theme-light',
  settings: { ...defaultSettings },
  openModal: null,
  deferredInstallPrompt: null,
  savingTask: false,
  lastFocusedElement: null,
  modalOpenCount: 0,
  suppressNextPop: false,
  notifiedReminderIds: new Set(),
  noteDraftColor: NOTE_COLORS[0],
  alarmDraftDays: [],
  timer: {
    mode: 'countdown',
    running: false,
    durationMs: 25 * 60 * 1000,
    remainingMs: 25 * 60 * 1000,
    endAt: 0,
    intervalId: null,
  },
  stopwatch: {
    running: false,
    elapsedMs: 0,
    startedAt: 0,
    intervalId: null,
    laps: [],
  },
  firedAlarms: {},
  ringingAlarmId: null,
  webAlarmIntervalId: null,
  nativeAlarmAvailable: false,
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
  confirmModal: document.getElementById('confirmModal'),
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
  saveTaskButton: document.getElementById('saveTaskButton'),
  titleError: document.getElementById('titleError'),
  reminderNotice: document.getElementById('reminderNotice'),
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
  installBanner: document.getElementById('installBanner'),
  installAppButton: document.getElementById('installAppButton'),
  dismissInstallBanner: document.getElementById('dismissInstallBanner'),
  installSettingItem: document.getElementById('installSettingItem'),
  installSettingText: document.getElementById('installSettingText'),
  connectionStatus: document.getElementById('connectionStatus'),
  confirmModalMessage: document.getElementById('confirmModalMessage'),
  confirmModalAccept: document.getElementById('confirmModalAccept'),
  toastContainer: document.getElementById('toastContainer'),
  overdueCount: document.getElementById('overdueCount'),
  appShell: document.querySelector('.app-shell'),

  quickAddButton: document.getElementById('quickAddButton'),
  quickAddModal: document.getElementById('quickAddModal'),
  homeNoteCount: document.getElementById('homeNoteCount'),
  homeAlarmCount: document.getElementById('homeAlarmCount'),

  noteList: document.getElementById('noteList'),
  noteSearchInput: document.getElementById('noteSearchInput'),
  noteFilterTabs: Array.from(document.querySelectorAll('[data-note-filter]')),
  noteModal: document.getElementById('noteModal'),
  noteForm: document.getElementById('noteForm'),
  noteModalTitle: document.getElementById('noteModalTitle'),
  noteId: document.getElementById('noteId'),
  noteTitle: document.getElementById('noteTitle'),
  noteBody: document.getElementById('noteBody'),
  notePinned: document.getElementById('notePinned'),
  noteColorPalette: document.getElementById('noteColorPalette'),
  noteError: document.getElementById('noteError'),
  deleteNoteButton: document.getElementById('deleteNoteButton'),

  alarmList: document.getElementById('alarmList'),
  newAlarmButton: document.getElementById('newAlarmButton'),
  alarmModal: document.getElementById('alarmModal'),
  alarmForm: document.getElementById('alarmForm'),
  alarmModalTitle: document.getElementById('alarmModalTitle'),
  alarmId: document.getElementById('alarmId'),
  alarmTime: document.getElementById('alarmTime'),
  alarmLabel: document.getElementById('alarmLabel'),
  alarmRepeat: document.getElementById('alarmRepeat'),
  alarmDaysField: document.getElementById('alarmDaysField'),
  alarmDaysPicker: document.getElementById('alarmDaysPicker'),
  alarmSound: document.getElementById('alarmSound'),
  alarmSnooze: document.getElementById('alarmSnooze'),
  alarmVibration: document.getElementById('alarmVibration'),
  alarmNotice: document.getElementById('alarmNotice'),
  alarmPermissionNote: document.getElementById('alarmPermissionNote'),
  alarmSubtitle: document.getElementById('alarmSubtitle'),
  deleteAlarmButton: document.getElementById('deleteAlarmButton'),
  previewAlarmSound: document.getElementById('previewAlarmSound'),

  modeTabs: Array.from(document.querySelectorAll('[data-timer-mode]')),
  countdownPane: document.getElementById('countdownPane'),
  stopwatchPane: document.getElementById('stopwatchPane'),
  timerDisplay: document.getElementById('timerDisplay'),
  timerRingProgress: document.getElementById('timerRingProgress'),
  timerStatusLabel: document.getElementById('timerStatusLabel'),
  timerMinutes: document.getElementById('timerMinutes'),
  timerSeconds: document.getElementById('timerSeconds'),
  timerStartBtn: document.getElementById('timerStartBtn'),
  timerResetBtn: document.getElementById('timerResetBtn'),
  timerPresets: Array.from(document.querySelectorAll('.preset-chip')),
  stopwatchDisplay: document.getElementById('stopwatchDisplay'),
  stopwatchStartBtn: document.getElementById('stopwatchStartBtn'),
  stopwatchLapBtn: document.getElementById('stopwatchLapBtn'),
  stopwatchResetBtn: document.getElementById('stopwatchResetBtn'),
  lapsList: document.getElementById('lapsList'),

  ringingOverlay: document.getElementById('ringingOverlay'),
  ringingTitle: document.getElementById('ringingTitle'),
  ringingTime: document.getElementById('ringingTime'),
  ringingSnooze: document.getElementById('ringingSnooze'),
  ringingStop: document.getElementById('ringingStop'),
};

const themeCycle = ['theme-light', 'theme-dark', 'theme-night', 'theme-blue', 'theme-sunset', 'theme-nature', 'theme-amoled'];

initialize();

function initialize() {
  loadSettings();
  loadTasks();
  loadNotes();
  loadAlarms();
  loadFiredAlarms();
  hydrateCategorySelect();
  hydrateNoteColors();
  hydrateDayPicker();
  hydrateTimerDefaults();
  bindEvents();
  applyTheme(state.selectedTheme);
  renderApp();
  setTodayDate();
  updateWelcomeGreeting();
  registerServiceWorker();
  initInstallPrompt();
  initNativeBridge();
  initConnectionStatus();
  syncAllReminders();
  startReminderWatcher();
  initHistoryHandling();
  handleLaunchParams();
  initAlarms();
  initTimer();
}

function bindEvents() {
  ui.searchInput.addEventListener('input', (event) => {
    state.searchTerm = event.target.value.trim().toLowerCase();
    renderTaskList();
  });

  ui.filterTabs.forEach((button) => {
    button.addEventListener('click', () => {
      state.activeFilter = button.dataset.filter;
      ui.filterTabs.forEach((chip) => {
        const isActive = chip === button;
        chip.classList.toggle('active', isActive);
        chip.setAttribute('aria-pressed', String(isActive));
      });
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
      ui.navItems.forEach((nav) => {
        const isActive = nav === button;
        nav.classList.toggle('active', isActive);
        nav.setAttribute('aria-current', isActive ? 'page' : 'false');
      });
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
    updateReminderNotice();
  });

  ui.themeButton.addEventListener('click', () => {
    cycleTheme();
  });

  document.querySelectorAll('[data-settings-action]').forEach((button) => {
    button.addEventListener('click', handleSettingsAction);
  });

  ui.installAppButton.addEventListener('click', handleInstallClick);
  ui.dismissInstallBanner.addEventListener('click', dismissInstallBanner);

  bindNoteEvents();
  bindAlarmEvents();
  bindTimerEvents();
  bindQuickAddEvents();
  bindQuickTargets();

  ui.confirmModalAccept.addEventListener('click', () => {
    hideModal('confirmModal');
    if (typeof state.confirmAction === 'function') {
      state.confirmAction();
      state.confirmAction = null;
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.openModal) {
      hideModal(state.openModal);
      return;
    }

    if (event.key === 'Tab' && state.openModal) {
      const container = document.getElementById(state.openModal);
      if (!container || !container.contains(document.activeElement)) {
        return;
      }
      const focusables = Array.from(
        container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.disabled && el.offsetParent !== null);
      if (!focusables.length) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  document.addEventListener('click', (event) => {
    const modal = event.target.closest('.modal');
    if (modal && event.target === modal && state.openModal === modal.id) {
      hideModal(modal.id);
    }

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
        requestDeleteTask(card.dataset.taskId);
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
    state.tasks = raw ? sanitizeTasks(JSON.parse(raw)) : [];
  } catch (error) {
    state.tasks = [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
  } catch (error) {
    showToast('Unable to save tasks. Storage may be full.', 'error');
  }
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

function sanitizeTasks(tasks) {
  if (!Array.isArray(tasks)) {
    return [];
  }

  return tasks
    .map((task) => {
      if (!task || typeof task !== 'object') {
        return null;
      }
      return {
        id: String(task.id || createId()),
        title: String(task.title || '').trim().slice(0, 120),
        description: String(task.description || ''),
        dueDate: String(task.dueDate || ''),
        dueTime: String(task.dueTime || ''),
        priority: priorities.includes(task.priority) ? task.priority : 'Medium',
        category: String(task.category || '📌 Other'),
        reminderEnabled: Boolean(task.reminderEnabled),
        reminderDateTime: String(task.reminderDateTime || ''),
        completed: Boolean(task.completed),
        completedAt: task.completedAt || null,
        createdAt: task.createdAt || new Date().toISOString(),
        updatedAt: task.updatedAt || new Date().toISOString(),
      };
    })
    .filter(Boolean);
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
  renderNotes();
  renderAlarms();
  renderHomeQuickCounts();
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

  const overdueCount = state.tasks.filter((task) => isOverdue(task)).length;
  ui.overdueCount.textContent = overdueCount;
  ui.overdueCount.hidden = overdueCount === 0;

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
    <div class="task-card ${task.completed ? 'completed' : ''} ${isOverdue(task) ? 'overdue' : ''}" data-task-id="${escapeHtml(task.id)}">
      <div class="task-main">
        <button class="complete-toggle" type="button" aria-label="${task.completed ? 'Mark task incomplete' : 'Mark task complete'}" aria-pressed="${task.completed}">✓</button>
        <div class="task-copy">
          <div class="task-row">
            <h4 class="task-title">${escapeHtml(task.title)}</h4>
            <span class="priority-badge priority-${safePriorityClass(task.priority)}">${escapeHtml(task.priority)}</span>
          </div>
          <div class="task-meta">
            <span class="meta-tag">${escapeHtml(formatDate(task.dueDate))}</span>
            <span class="meta-tag">${escapeHtml(task.category)}</span>
            ${isOverdue(task) ? '<span class="meta-tag overdue-tag">Overdue</span>' : ''}
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
        <article class="task-card ${task.completed ? 'completed' : ''} ${isOverdue(task) ? 'overdue' : ''}" data-task-id="${escapeHtml(task.id)}">
          <div class="task-main">
            <button class="complete-toggle" type="button" aria-label="${task.completed ? 'Mark task incomplete' : 'Mark task complete'}" aria-pressed="${task.completed}">✓</button>
            <div class="task-copy">
              <div class="task-row">
                <h4 class="task-title">${escapeHtml(task.title)}</h4>
                <span class="priority-badge priority-${safePriorityClass(task.priority)}">${escapeHtml(task.priority)}</span>
              </div>
              ${description}
              <div class="task-meta">
                <span class="meta-tag due-tag">${task.dueDate ? escapeHtml(formatDate(task.dueDate)) : 'No date'}</span>
                <span class="meta-tag category-tag">${escapeHtml(task.category)}</span>
                ${isOverdue(task) ? '<span class="meta-tag overdue-tag">Overdue</span>' : ''}
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
      <article class="task-card completed" data-task-id="${escapeHtml(task.id)}">
        <div class="task-main">
          <button class="complete-toggle" type="button" aria-label="Mark task incomplete" aria-pressed="true">✓</button>
          <div class="task-copy">
            <div class="task-row">
              <h4 class="task-title">${escapeHtml(task.title)}</h4>
              <span class="priority-badge priority-${safePriorityClass(task.priority)}">${escapeHtml(task.priority)}</span>
            </div>
            <p class="task-description">${escapeHtml(task.description || 'No description')}</p>
            <div class="task-meta">
              <span class="meta-tag">${task.dueDate ? escapeHtml(formatDate(task.dueDate)) : 'No date'}</span>
              <span class="meta-tag">${escapeHtml(task.category)}</span>
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

function isOverdue(task) {
  return Boolean(!task.completed && task.dueDate && task.dueDate < getLocalDateString(new Date()));
}

function safePriorityClass(priority) {
  return priorities.includes(priority) ? priority.toLowerCase() : 'medium';
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
        case 'overdue':
          return isOverdue(task);
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
  ui.titleError.hidden = true;
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
    ui.taskPriority.value = state.settings.defaultPriority || 'Medium';
    ui.taskReminderDateTime.value = '';
  }

  updateReminderNotice();
  showModal('taskModal');
  setTimeout(() => ui.taskTitle.focus(), 50);
}

function handleTaskSubmit(event) {
  event.preventDefault();

  if (state.savingTask) {
    return;
  }

  const title = ui.taskTitle.value.trim();
  if (!title) {
    ui.titleError.textContent = 'Please enter a task title.';
    ui.titleError.hidden = false;
    ui.taskTitle.focus();
    return;
  }
  if (title.length > 120) {
    ui.titleError.textContent = 'Title must be 120 characters or fewer.';
    ui.titleError.hidden = false;
    ui.taskTitle.focus();
    return;
  }

  const id = ui.taskId.value || createId();
  const now = new Date().toISOString();
  const reminderEnabled = ui.taskReminderEnabled.checked && state.settings.remindersEnabled;
  const reminderDateTime = reminderEnabled && ui.taskReminderDateTime.value
    ? ui.taskReminderDateTime.value
    : '';

  const existingIndex = state.tasks.findIndex((item) => item.id === id);
  const isEditing = existingIndex >= 0;

  const task = {
    id,
    title,
    description: ui.taskDescription.value.trim(),
    dueDate: ui.taskDueDate.value || '',
    dueTime: ui.taskDueTime.value || '',
    priority: ui.taskPriority.value,
    category: ui.taskCategory.value,
    reminderEnabled,
    reminderDateTime: reminderDateTime || (reminderEnabled ? calculateReminderDateTime(ui.taskDueDate.value, ui.taskDueTime.value) : ''),
    completed: isEditing ? state.tasks[existingIndex].completed : false,
    completedAt: isEditing ? state.tasks[existingIndex].completedAt : null,
    createdAt: isEditing ? state.tasks[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (isEditing) {
    state.tasks[existingIndex] = task;
  } else {
    state.tasks.push(task);
  }

  state.settings.defaultPriority = ui.taskPriority.value;
  state.settings.defaultCategory = ui.taskCategory.value;
  saveSettings();
  saveTasks();

  scheduleTaskReminder(task);

  state.savingTask = false;
  hideModal('taskModal');
  renderApp();
  showToast(isEditing ? 'Task updated.' : 'Task added.', 'success');
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

function requestDeleteTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }

  showConfirmDialog(
    'Delete task?',
    `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
    () => deleteTask(taskId)
  );
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  saveTasks();
  cancelTaskReminder(taskId);
  renderApp();
  showToast('Task deleted.', 'neutral');
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

  if (task.completed) {
    cancelTaskReminder(taskId);
  } else if (task.reminderEnabled && task.reminderDateTime) {
    scheduleTaskReminder(task);
  }

  renderApp();
  showToast(task.completed ? 'Task completed. 🎉' : 'Task marked pending.', 'success');
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
      <strong>${task.dueDate ? escapeHtml(formatDate(task.dueDate)) : 'No due date'}${isOverdue(task) ? ' — ⏰ Overdue' : ''}</strong>
    </div>
    <div class="detail-item">
      <span>Due Time</span>
      <strong>${escapeHtml(task.dueTime || 'No due time')}</strong>
    </div>
    <div class="detail-item">
      <span>Priority</span>
      <strong>${escapeHtml(task.priority)}</strong>
    </div>
    <div class="detail-item">
      <span>Category</span>
      <strong>${escapeHtml(task.category)}</strong>
    </div>
    <div class="detail-item">
      <span>Reminder</span>
      <strong>${task.reminderEnabled ? `Enabled (${escapeHtml(task.reminderDateTime || 'No date set')})` : 'Disabled'}</strong>
    </div>
    <div class="detail-item">
      <span>Created Date</span>
      <strong>${task.createdAt ? escapeHtml(new Date(task.createdAt).toLocaleString()) : 'Unknown'}</strong>
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
    case 'install-app':
      handleInstallClick();
      break;
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
        <p class="notice-text reminder-platform-note"></p>
        <div class="field-group">
          <label for="defaultReminderTime">Default reminder time (minutes ahead)</label>
          <input id="defaultReminderTime" type="number" min="5" max="1440" step="5" value="${escapeHtml(String(state.settings.defaultReminderMinutes || 30))}" />
        </div>
        <div class="modal-actions">
          <button type="button" class="primary-btn" id="saveReminderSettings">Save</button>
        </div>
      `;
      document.querySelector('.reminder-platform-note').textContent = reminderPlatformNote();
      document.getElementById('saveReminderSettings').addEventListener('click', async () => {
        state.settings.remindersEnabled = document.getElementById('reminderToggle').checked;
        state.settings.defaultReminderMinutes = Number(document.getElementById('defaultReminderTime').value || 30);
        saveSettings();
        if (state.settings.remindersEnabled) {
          await ensureNotificationPermission();
        }
        syncAllReminders();
        detail.classList.add('hidden');
        showToast('Reminder settings saved.', 'success');
      });
      break;
    case 'alarm-settings':
      renderAlarmSettingsPanel(detail);
      break;
    case 'sound-settings':
      renderSoundSettingsPanel(detail);
      break;
    case 'completed-quests':
      detail.classList.add('hidden');
      setActiveNav('completed');
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
        showToast('Default priority saved.', 'success');
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
        showToast('Default category saved.', 'success');
      });
      break;
    case 'export-data':
    case 'export-tasks':
      exportTasks();
      break;
    case 'import-data':
    case 'import-tasks':
      importTasks();
      break;
    case 'clear-data':
    case 'clear-tasks':
      if (state.tasks.length || state.notes.length || state.alarms.length) {
        showConfirmDialog(
          'Clear all data?',
          'This will permanently delete all tasks, notes, and alarms. This action cannot be undone.',
          () => {
            state.tasks = [];
            state.notes = [];
            state.alarms = [];
            saveTasks();
            saveNotes();
            saveAlarms();
            clearAllReminders();
            cancelAllNativeAlarms();
            renderApp();
            showToast('All data cleared.', 'neutral');
          }
        );
      } else {
        showToast('Nothing to clear.', 'neutral');
      }
      break;
    case 'app-version':
      detail.classList.remove('hidden');
      detail.innerHTML = `
        <div class="detail-item">
          <span>App Version</span>
          <strong>${escapeHtml(String(state.settings.appVersion || defaultSettings.appVersion))}</strong>
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
        <div class="detail-item">
          <span>What's new in v2.0</span>
          <strong>Notes collection, countdown timer &amp; stopwatch, recurring alarms with sound, and richer notifications.</strong>
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
    <button class="theme-option ${isSelected ? 'selected' : ''}" type="button" data-theme-option="${themeName}" aria-pressed="${isSelected}">
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

  const themeColor = themeName === 'theme-light' || themeName === 'theme-blue' || themeName === 'theme-sunset' || themeName === 'theme-nature'
    ? '#6C63FF'
    : '#101827';

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', themeColor);
  }

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
  const backup = {
    app: 'RPG Todo',
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    tasks: state.tasks,
    notes: state.notes,
    alarms: state.alarms,
    settings: state.settings,
  };
  const content = JSON.stringify(backup, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'rpg-todo-backup.json';
  link.click();
  URL.revokeObjectURL(url);
  showToast('Backup exported.', 'success');
}

function importTasks() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const isBackup = parsed && !Array.isArray(parsed) && typeof parsed === 'object';
        const rawTasks = isBackup ? parsed.tasks : parsed;
        const cleanedTasks = sanitizeTasks(rawTasks);
        const cleanedNotes = isBackup ? sanitizeNotes(parsed.notes) : [];
        const cleanedAlarms = isBackup ? sanitizeAlarms(parsed.alarms) : [];

        state.tasks = cleanedTasks;
        if (isBackup) {
          state.notes = cleanedNotes;
          state.alarms = cleanedAlarms;
          if (parsed.settings && typeof parsed.settings === 'object') {
            state.settings = { ...state.settings, ...parsed.settings, appVersion: APP_VERSION };
            saveSettings();
          }
        }
        saveTasks();
        saveNotes();
        saveAlarms();
        syncAllReminders();
        syncAlarmsToNative();
        renderApp();
        showToast(
          isBackup
            ? `Imported ${cleanedTasks.length} tasks, ${cleanedNotes.length} notes, ${cleanedAlarms.length} alarms.`
            : `Imported ${cleanedTasks.length} tasks.`,
          'success'
        );
      } catch (error) {
        showToast('Import failed. Please choose a valid RPG Todo backup.', 'error');
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

function showConfirmDialog(title, message, onConfirm) {
  ui.confirmModalMessage.textContent = message;
  document.getElementById('confirmModalTitle').textContent = title;
  state.confirmAction = onConfirm;
  showModal('confirmModal');
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    return;
  }
  if (state.openModal && state.openModal !== modalId) {
    hideModal(state.openModal);
  }

  state.openModal = modalId;
  state.lastFocusedElement = document.activeElement;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  if (ui.appShell) {
    ui.appShell.setAttribute('inert', '');
  }

  // Push a history entry so the browser/back button closes the modal instead of leaving the page.
  if (typeof window.history.pushState === 'function' && !isNativePlatform()) {
    state.modalOpenCount += 1;
    window.history.pushState({ rpgTodoModal: modalId, count: state.modalOpenCount }, '');
  }

  trapFocus(modal);
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal || state.openModal !== modalId) {
    return;
  }

  closeModalDirect(modalId);

  // Pop the history entry this modal pushed, keeping back-button state consistent.
  if (typeof window.history.back === 'function' && state.modalOpenCount > 0 && !isNativePlatform()) {
    const popped = window.history.state && window.history.state.rpgTodoModal === modalId;
    state.modalOpenCount -= 1;
    if (popped) {
      state.suppressNextPop = true;
      window.history.back();
    }
  }
}

function closeModalDirect(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    return;
  }

  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');

  if (ui.appShell) {
    ui.appShell.removeAttribute('inert');
  }

  if (state.openModal === modalId) {
    state.openModal = null;
  }

  if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === 'function') {
    state.lastFocusedElement.focus();
    state.lastFocusedElement = null;
  }
}

function trapFocus(container) {
  const focusables = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusables.length) {
    if (container && container.focus) {
      container.focus();
    }
    return;
  }
  if (document.activeElement === document.body || !container.contains(document.activeElement)) {
    focusables[0].focus();
  }
}

function initHistoryHandling() {
  window.addEventListener('popstate', () => {
    if (state.suppressNextPop) {
      state.suppressNextPop = false;
      return;
    }
    if (state.openModal && document.getElementById(state.openModal)) {
      closeModalDirect(state.openModal);
      return;
    }
    if (state.activeNav !== 'home') {
      setActiveNav('home');
    }
  });
}

function showToast(message, type = 'neutral') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  ui.toastContainer.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  if (isNativePlatform()) {
    return;
  }

  // Registered immediately (not on window.load) so Chrome sees an active worker
  // with a fetch handler as early as possible and can fire beforeinstallprompt.
  navigator.serviceWorker
    .register('sw.js', { scope: './' })
    .then((registration) => {
      registration.update();

      if (!navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          refreshInstallUi();
        });
      }

      return registration;
    })
    .then(() => {
      refreshInstallUi();
      showInstallBannerIfWeb();
    })
    .catch((error) => {
      console.error('Service worker registration failed:', error);
    });
}

function initInstallPrompt() {
  refreshInstallUi();

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    refreshInstallUi();
    showInstallBannerIfWeb();
  });

  window.addEventListener('appinstalled', () => {
    state.deferredInstallPrompt = null;
    localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    ui.installBanner.hidden = true;
    ui.installSettingItem.hidden = true;
    showToast('App installed. Find RPG Todo on your home screen.', 'success');
  });
}

function refreshInstallUi() {
  if (isNativePlatform() || isStandalone()) {
    ui.installSettingItem.hidden = true;
    ui.installBanner.hidden = true;
    return;
  }

  ui.installSettingItem.hidden = false;
  ui.installSettingText.textContent = state.deferredInstallPrompt ? 'Install App' : 'How to Install';
}

function showInstallBannerIfWeb() {
  const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
  if (dismissed !== '1' && !isNativePlatform() && !isStandalone()) {
    ui.installBanner.hidden = false;
  }
}

function dismissInstallBanner() {
  localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
  ui.installBanner.hidden = true;
}

async function handleInstallClick() {
  if (state.deferredInstallPrompt) {
    state.deferredInstallPrompt.prompt();
    const choice = await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    if (choice && choice.outcome === 'accepted') {
      return;
    }
    ui.installBanner.hidden = true;
    refreshInstallUi();
    return;
  }

  showInstallInstructions();
}

function showInstallInstructions() {
  if (isStandalone()) {
    showToast('RPG Todo is already installed and running as an app.', 'neutral');
    return;
  }

  if (isIosSafari()) {
    showConfirmDialog(
      'Install on iPhone/iPad',
      'Tap the Share button (square with arrow), then choose "Add to Home Screen". RPG Todo will appear like a native app on your home screen.'
    );
    return;
  }

  if (isAndroidBrowser()) {
    showConfirmDialog(
      'Install on Android',
      'Tap the three-dot menu at the top right of Chrome, then choose "Install app" or "Add to Home screen". RPG Todo opens full screen like a normal app and works offline.'
    );
    return;
  }

  showConfirmDialog(
    'Install RPG Todo',
    'Open this page in Chrome on Android or Safari on iPhone, then use the browser menu and choose "Install app" or "Add to Home Screen".'
  );
}

function handleLaunchParams() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  if (action === 'add') {
    openTaskModal();
  } else if (action === 'note') {
    setActiveNav('notes');
    openNoteModal();
  } else if (action === 'alarm') {
    setActiveNav('alarms');
    openAlarmModal();
  }
}

function initNativeBridge() {
  if (!isNativePlatform()) {
    return;
  }

  const App = getCapacitorPlugin('App');
  if (App && typeof App.addListener === 'function') {
    App.addListener('backButton', () => {
      if (state.openModal) {
        hideModal(state.openModal);
        return;
      }
      if (state.activeNav !== 'home') {
        setActiveNav('home');
        return;
      }
      if (App.exitApp && typeof App.exitApp === 'function') {
        App.exitApp();
      } else if (App.minimizeApp) {
        App.minimizeApp();
      }
    });
  }
}

function setActiveNav(target) {
  state.activeNav = target;
  ui.navItems.forEach((nav) => {
    const isActive = nav.dataset.nav === target;
    nav.classList.toggle('active', isActive);
    nav.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
  renderScreens();
}

function initConnectionStatus() {
  const update = () => {
    const isOffline = !navigator.onLine;
    ui.connectionStatus.hidden = !isOffline;
    if (isOffline) {
      ui.connectionStatus.textContent = 'Offline — changes saved on device';
    }
  };

  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

function isNativePlatform() {
  return typeof window !== 'undefined' && typeof window.Capacitor !== 'undefined' && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform();
}

function isIosSafari() {
  const ua = navigator.userAgent.toLowerCase();
  const isIPhone = /iphone|ipad|ipod/.test(ua);
  const isSafari = ua.includes('safari') && !ua.includes('crios') && !ua.includes('fxios');
  return isIPhone && isSafari;
}

function isAndroidBrowser() {
  return /android/.test(navigator.userAgent.toLowerCase());
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function getCapacitorPlugin(name) {
  try {
    if (!isNativePlatform() && name !== 'LocalNotifications') {
      return null;
    }
    const plugins = window.Capacitor && window.Capacitor.Plugins;
    return plugins && plugins[name] ? plugins[name] : null;
  } catch (error) {
    return null;
  }
}

function reminderPlatformNote() {
  if (isNativePlatform()) {
    return 'Reminders are scheduled on this device and can ring even when the app is closed.';
  }
  return 'On this website, reminders show while the page is open. Reminders that ring when the app is closed are available in the installed Android app.';
}

function updateReminderNotice() {
  if (!ui.reminderNotice) {
    return;
  }
  const note = reminderPlatformNote();
  if (!ui.taskReminderEnabled.checked) {
    ui.reminderNotice.hidden = true;
    return;
  }
  ui.reminderNotice.textContent = note;
  ui.reminderNotice.hidden = false;
}

async function ensureNotificationPermission() {
  const LocalNotifications = getCapacitorPlugin('LocalNotifications');
  if (!LocalNotifications || typeof LocalNotifications.requestPermissions !== 'function') {
    return;
  }
  try {
    await LocalNotifications.requestPermissions();
  } catch (error) {
    // Permission denied or unsupported; reminders degrade gracefully.
  }
}

function notificationIdFor(taskId) {
  let hash = 0;
  const str = String(taskId);
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

async function scheduleTaskReminder(task) {
  if (!task || !task.reminderEnabled || !task.reminderDateTime) {
    return;
  }

  const when = new Date(task.reminderDateTime);
  if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
    return;
  }

  const LocalNotifications = getCapacitorPlugin('LocalNotifications');
  if (!LocalNotifications || typeof LocalNotifications.schedule !== 'function') {
    return;
  }

  try {
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted' && permission.display !== 'prompt') {
      return;
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationIdFor(task.id),
          title: 'RPG Todo Reminder',
          body: task.title,
          schedule: { at: when },
          extra: { taskId: task.id },
        },
      ],
    });
  } catch (error) {
    // Notification scheduling failed (e.g. permission denied). This is non-critical.
  }
}

async function cancelTaskReminder(taskId) {
  const LocalNotifications = getCapacitorPlugin('LocalNotifications');
  if (!LocalNotifications || typeof LocalNotifications.cancel !== 'function') {
    return;
  }
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationIdFor(taskId) }] });
  } catch (error) {
    // Best-effort cancellation.
  }
}

async function clearAllReminders() {
  const LocalNotifications = getCapacitorPlugin('LocalNotifications');
  if (!LocalNotifications || typeof LocalNotifications.cancel !== 'function') {
    return;
  }
  try {
    const allPending = state.tasks.map((task) => ({ id: notificationIdFor(task.id) }));
    if (allPending.length) {
      await LocalNotifications.cancel({ notifications: allPending });
    }
  } catch (error) {
    // Best-effort cancellation.
  }
}

async function syncAllReminders() {
  if (!isNativePlatform()) {
    return;
  }
  const LocalNotifications = getCapacitorPlugin('LocalNotifications');
  if (!LocalNotifications) {
    return;
  }

  try {
    const pendingResult = await LocalNotifications.getPending();
    const pendingIds = (pendingResult.notifications || []).map((n) => n.id);
    const keptIds = state.tasks
      .filter((task) => task.reminderEnabled && task.reminderDateTime)
      .map((task) => notificationIdFor(task.id));
    const staleIds = pendingIds.filter((id) => !keptIds.includes(id));
    if (staleIds.length) {
      await LocalNotifications.cancel({ notifications: staleIds.map((id) => ({ id })) });
    }
  } catch (error) {
    // Ignore sync errors; scheduling is best-effort per-task.
  }

  state.tasks.forEach((task) => scheduleTaskReminder(task));
}

function startReminderWatcher() {
  checkDueReminders();
  setInterval(checkDueReminders, 30000);
}

function checkDueReminders() {
  const now = new Date();

  state.tasks.forEach((task) => {
    if (task.completed) {
      return;
    }

    const reminderKey = `reminder-${task.id}`;
    if (task.reminderEnabled && task.reminderDateTime && !state.notifiedReminderIds.has(reminderKey)) {
      const when = new Date(task.reminderDateTime);
      if (!Number.isNaN(when.getTime()) && when.getTime() <= now.getTime()) {
        state.notifiedReminderIds.add(reminderKey);
        showToast(`🔔 Reminder: ${task.title}`, 'success');
        fireWebNotification('RPG Todo Reminder', task.title);
      }
    }

    const overdueKey = `overdue-${task.id}`;
    if (isOverdue(task) && !state.notifiedReminderIds.has(overdueKey)) {
      state.notifiedReminderIds.add(overdueKey);
      showToast(`⏰ Overdue: ${task.title}`, 'danger');
    }
  });
}

function fireWebNotification(title, body) {
  try {
    if ('Notification' in window && Notification.permission === 'granted' && isNativePlatform() === false) {
      new Notification(title, { body, icon: 'assets/icon-192.png' });
    }
  } catch (error) {
    // Web notifications are best-effort; toasts already cover the case.
  }
}

function createId(prefix = 'task') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
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

/* ============================================================
   v2.0 — Sound engine (Web Audio, no binary assets required)
   ============================================================ */

let audioContext = null;
let alarmLoopHandle = null;

function ensureAudioContext() {
  if (audioContext) {
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => undefined);
    }
    return audioContext;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) {
    return null;
  }
  try {
    audioContext = new Ctx();
  } catch (error) {
    audioContext = null;
  }
  return audioContext;
}

function soundGain() {
  const value = Number(state.settings.soundVolume);
  const clamped = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 70;
  return clamped / 100;
}

function playBeep(freq, startOffset, duration, type) {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }
  const startAt = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, startAt);
  const peak = Math.max(0.0001, soundGain() * 0.32);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

function alarmPattern() {
  const tone = state.settings.soundTone || 'alarm';
  if (tone === 'notification') {
    playBeep(1046, 0, 0.16, 'sine');
    playBeep(1318, 0.2, 0.22, 'sine');
    return;
  }
  if (tone === 'digital') {
    for (let i = 0; i < 4; i += 1) {
      playBeep(1200, i * 0.16, 0.09, 'square');
    }
    return;
  }
  playBeep(880, 0, 0.22, 'square');
  playBeep(660, 0.28, 0.22, 'square');
}

function playSound(name) {
  if (!state.settings.soundEnabled) {
    return;
  }
  switch (name) {
    case 'timer':
      playBeep(880, 0, 0.18, 'sine');
      playBeep(1174, 0.22, 0.18, 'sine');
      playBeep(1568, 0.44, 0.3, 'sine');
      break;
    case 'notification':
      playBeep(1046, 0, 0.12, 'triangle');
      playBeep(1318, 0.15, 0.16, 'triangle');
      break;
    case 'tap':
      playBeep(520, 0, 0.06, 'sine');
      break;
    case 'alarm':
    default:
      alarmPattern();
  }
}

function startAlarmLoop() {
  stopAlarmLoop();
  if (!state.settings.soundEnabled) {
    return;
  }
  alarmPattern();
  alarmLoopHandle = setInterval(alarmPattern, 1400);
}

function stopAlarmLoop() {
  if (alarmLoopHandle) {
    clearInterval(alarmLoopHandle);
    alarmLoopHandle = null;
  }
}

function previewAlarmTone() {
  const choice = ui.alarmSound.value;
  stopAlarmLoop();
  if (choice === 'silent') {
    showToast('This alarm will be silent.', 'neutral');
    return;
  }
  if (choice === 'notification') {
    playBeep(1046, 0, 0.14, 'triangle');
    playBeep(1318, 0.16, 0.18, 'triangle');
    return;
  }
  alarmPattern();
}

function vibratePattern(pattern) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      // Vibration is best-effort.
    }
  }
}

/* ============================================================
   v2.0 — Notes collection
   ============================================================ */

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.notes);
    state.notes = raw ? sanitizeNotes(JSON.parse(raw)) : [];
  } catch (error) {
    state.notes = [];
  }
}

function saveNotes() {
  try {
    localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(state.notes));
  } catch (error) {
    showToast('Unable to save notes. Storage may be full.', 'error');
  }
}

function sanitizeNotes(notes) {
  if (!Array.isArray(notes)) {
    return [];
  }
  return notes
    .map((note) => {
      if (!note || typeof note !== 'object') {
        return null;
      }
      const color = NOTE_COLORS.includes(note.color) ? note.color : NOTE_COLORS[0];
      const now = new Date().toISOString();
      return {
        id: String(note.id || createId('note')),
        title: String(note.title || '').slice(0, 120),
        body: String(note.body || ''),
        color,
        pinned: Boolean(note.pinned),
        createdAt: note.createdAt || now,
        updatedAt: note.updatedAt || now,
      };
    })
    .filter(Boolean);
}

function hydrateNoteColors() {
  if (!ui.noteColorPalette) {
    return;
  }
  ui.noteColorPalette.innerHTML = NOTE_COLORS.map(
    (color) =>
      `<button type="button" class="color-swatch ${color === state.noteDraftColor ? 'selected' : ''}" data-color="${color}" style="background:${color};" aria-label="Note color ${color}" aria-pressed="${color === state.noteDraftColor}"></button>`
  ).join('');
}

function findNote(id) {
  return state.notes.find((note) => note.id === id);
}

function getFilteredNotes() {
  const search = state.noteSearchTerm;
  let notes = [...state.notes].filter((note) => {
    if (!search) {
      return true;
    }
    return [note.title, note.body].some((value) => String(value || '').toLowerCase().includes(search));
  });

  if (state.activeNoteFilter === 'pinned') {
    notes = notes.filter((note) => note.pinned);
  }

  notes.sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return Number(b.pinned) - Number(a.pinned);
    }
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  return state.activeNoteFilter === 'recent' && !search ? notes.slice(0, 12) : notes;
}

function formatNoteDate(iso) {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderNotes() {
  if (!ui.noteList) {
    return;
  }
  const notes = getFilteredNotes();
  if (!notes.length) {
    ui.noteList.innerHTML = '<div class="empty-state">No notes yet. Tap ＋ to write one.</div>';
    return;
  }

  ui.noteList.innerHTML = notes
    .map((note) => {
      const preview = note.body ? escapeHtml(note.body) : '<em>Empty note</em>';
      return `
        <article class="note-card ${note.pinned ? 'pinned' : ''}" data-note-id="${escapeHtml(note.id)}" style="background:${note.color};">
          <div class="task-row">
            <div class="note-card-title">${escapeHtml(note.title || 'Untitled')}</div>
            <button class="note-pin-badge" type="button" data-action="pin-note" aria-label="${note.pinned ? 'Unpin note' : 'Pin note'}">${note.pinned ? '📌' : '📍'}</button>
          </div>
          <div class="note-card-body">${preview}</div>
          <div class="note-card-meta"><span>${escapeHtml(formatNoteDate(note.updatedAt))}</span></div>
        </article>
      `;
    })
    .join('');
}

function openNoteModal(noteId = null) {
  if (!ui.noteModal) {
    return;
  }
  ui.noteForm.reset();
  ui.noteError.hidden = true;

  if (noteId) {
    const note = findNote(noteId);
    if (!note) {
      return;
    }
    ui.noteModalTitle.textContent = 'Edit Note';
    ui.noteId.value = note.id;
    ui.noteTitle.value = note.title;
    ui.noteBody.value = note.body;
    ui.notePinned.checked = note.pinned;
    state.noteDraftColor = note.color;
    ui.deleteNoteButton.hidden = false;
  } else {
    ui.noteModalTitle.textContent = 'New Note';
    ui.noteId.value = '';
    ui.noteTitle.value = '';
    ui.noteBody.value = '';
    ui.notePinned.checked = false;
    state.noteDraftColor = NOTE_COLORS.includes(state.settings.noteColor) ? state.settings.noteColor : NOTE_COLORS[0];
    ui.deleteNoteButton.hidden = true;
  }

  hydrateNoteColors();
  showModal('noteModal');
  setTimeout(() => ui.noteTitle.focus(), 50);
}

function handleNoteSubmit(event) {
  event.preventDefault();
  const title = ui.noteTitle.value.trim();
  const body = ui.noteBody.value;

  if (!title && !body.trim()) {
    ui.noteError.textContent = 'Write a title or some text before saving.';
    ui.noteError.hidden = false;
    ui.noteTitle.focus();
    return;
  }

  const id = ui.noteId.value || createId('note');
  const now = new Date().toISOString();
  const index = state.notes.findIndex((note) => note.id === id);
  const fallbackTitle = title || body.trim().split('\n')[0].slice(0, 40) || 'Untitled';

  const note = {
    id,
    title: fallbackTitle,
    body,
    color: state.noteDraftColor,
    pinned: ui.notePinned.checked,
    createdAt: index >= 0 ? state.notes[index].createdAt : now,
    updatedAt: now,
  };

  if (index >= 0) {
    state.notes[index] = note;
  } else {
    state.notes.unshift(note);
  }

  state.settings.noteColor = state.noteDraftColor;
  saveSettings();
  saveNotes();
  hideModal('noteModal');
  renderApp();
  playSound('tap');
  showToast(index >= 0 ? 'Note updated.' : 'Note saved.', 'success');
}

function toggleNotePin(noteId) {
  const note = findNote(noteId);
  if (!note) {
    return;
  }
  note.pinned = !note.pinned;
  note.updatedAt = new Date().toISOString();
  saveNotes();
  renderNotes();
  playSound('tap');
}

function requestDeleteNote(noteId) {
  const note = findNote(noteId);
  if (!note) {
    return;
  }
  showConfirmDialog('Delete note?', `Delete "${note.title || 'this note'}"? This cannot be undone.`, () => deleteNote(noteId));
}

function deleteNote(noteId) {
  state.notes = state.notes.filter((note) => note.id !== noteId);
  saveNotes();
  hideModal('noteModal');
  renderApp();
  showToast('Note deleted.', 'neutral');
}

function bindNoteEvents() {
  if (!ui.noteList) {
    return;
  }

  ui.noteSearchInput.addEventListener('input', (event) => {
    state.noteSearchTerm = event.target.value.trim().toLowerCase();
    renderNotes();
  });

  ui.noteFilterTabs.forEach((button) => {
    button.addEventListener('click', () => {
      state.activeNoteFilter = button.dataset.noteFilter;
      ui.noteFilterTabs.forEach((chip) => {
        const isActive = chip === button;
        chip.classList.toggle('active', isActive);
        chip.setAttribute('aria-pressed', String(isActive));
      });
      renderNotes();
    });
  });

  ui.noteColorPalette.addEventListener('click', (event) => {
    const swatch = event.target.closest('[data-color]');
    if (!swatch) {
      return;
    }
    state.noteDraftColor = swatch.dataset.color;
    hydrateNoteColors();
  });

  ui.noteForm.addEventListener('submit', handleNoteSubmit);
  ui.deleteNoteButton.addEventListener('click', () => {
    const id = ui.noteId.value;
    if (id) {
      requestDeleteNote(id);
    }
  });

  ui.noteList.addEventListener('click', (event) => {
    const card = event.target.closest('.note-card');
    if (!card) {
      return;
    }
    const id = card.dataset.noteId;
    if (event.target.closest('[data-action="pin-note"]')) {
      toggleNotePin(id);
      return;
    }
    openNoteModal(id);
  });
}

/* ============================================================
   v2.0 — Timer & stopwatch
   ============================================================ */

function hydrateTimerDefaults() {
  const minutes = Math.floor(state.timer.durationMs / 60000);
  const seconds = Math.floor((state.timer.durationMs % 60000) / 1000);
  if (ui.timerMinutes) {
    ui.timerMinutes.value = String(minutes);
  }
  if (ui.timerSeconds) {
    ui.timerSeconds.value = String(seconds);
  }
}

function attachAudioUnlock() {
  const unlock = () => {
    ensureAudioContext();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function initTimer() {
  attachAudioUnlock();
  renderTimer();
  renderStopwatch();
}

function bindTimerEvents() {
  ui.modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => setTimerMode(tab.dataset.timerMode));
  });

  ui.timerStartBtn.addEventListener('click', timerStart);
  ui.timerResetBtn.addEventListener('click', timerReset);

  ui.timerPresets.forEach((chip) => {
    chip.addEventListener('click', () => {
      const minutes = Number(chip.dataset.minutes) || 25;
      ui.timerPresets.forEach((item) => item.classList.toggle('active', item === chip));
      ui.timerMinutes.value = String(minutes);
      ui.timerSeconds.value = '0';
      setTimerDuration(minutes * 60000);
    });
  });

  const syncCustomDuration = () => {
    const minutes = Math.max(0, Number(ui.timerMinutes.value) || 0);
    const seconds = Math.max(0, Math.min(59, Number(ui.timerSeconds.value) || 0));
    ui.timerPresets.forEach((item) => item.classList.remove('active'));
    setTimerDuration((minutes * 60 + seconds) * 1000);
  };
  ui.timerMinutes.addEventListener('change', syncCustomDuration);
  ui.timerSeconds.addEventListener('change', syncCustomDuration);

  ui.stopwatchStartBtn.addEventListener('click', stopwatchToggle);
  ui.stopwatchLapBtn.addEventListener('click', stopwatchLap);
  ui.stopwatchResetBtn.addEventListener('click', stopwatchReset);

  ui.ringingStop.addEventListener('click', stopRinging);
  ui.ringingSnooze.addEventListener('click', snoozeRinging);
}

function setTimerMode(mode) {
  state.timer.mode = mode;
  ui.modeTabs.forEach((tab) => {
    const isActive = tab.dataset.timerMode === mode;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-pressed', String(isActive));
  });
  ui.countdownPane.hidden = mode !== 'countdown';
  ui.stopwatchPane.hidden = mode !== 'stopwatch';
}

function setTimerDuration(ms) {
  const safe = Math.max(1000, ms);
  timerStopInterval();
  state.timer.running = false;
  state.timer.durationMs = safe;
  state.timer.remainingMs = safe;
  ui.timerStartBtn.textContent = 'Start';
  const wrap = ui.timerRingProgress.closest('.timer-ring-wrap');
  wrap.classList.remove('running', 'finished');
  ui.timerStatusLabel.textContent = 'Ready';
  renderTimer();
}

function timerStart() {
  if (state.timer.running) {
    timerPause();
    return;
  }
  if (state.timer.remainingMs <= 0) {
    state.timer.remainingMs = state.timer.durationMs;
  }
  ensureAudioContext();
  state.timer.running = true;
  state.timer.endAt = Date.now() + state.timer.remainingMs;
  ui.timerStartBtn.textContent = 'Pause';
  ui.timerRingProgress.closest('.timer-ring-wrap').classList.add('running');
  ui.timerRingProgress.closest('.timer-ring-wrap').classList.remove('finished');
  ui.timerStatusLabel.textContent = 'Running';
  timerStopInterval();
  state.timer.intervalId = setInterval(timerTick, 200);
  timerTick();
}

function timerPause() {
  timerStopInterval();
  state.timer.remainingMs = Math.max(0, state.timer.endAt - Date.now());
  state.timer.running = false;
  ui.timerStartBtn.textContent = 'Resume';
  ui.timerRingProgress.closest('.timer-ring-wrap').classList.remove('running');
  ui.timerStatusLabel.textContent = 'Paused';
  renderTimer();
}

function timerReset() {
  timerStopInterval();
  state.timer.running = false;
  state.timer.remainingMs = state.timer.durationMs;
  ui.timerStartBtn.textContent = 'Start';
  const wrap = ui.timerRingProgress.closest('.timer-ring-wrap');
  wrap.classList.remove('running', 'finished');
  ui.timerStatusLabel.textContent = 'Ready';
  renderTimer();
}

function timerStopInterval() {
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
}

function timerTick() {
  const remaining = state.timer.endAt - Date.now();
  state.timer.remainingMs = Math.max(0, remaining);
  renderTimer();
  if (remaining <= 0) {
    finishTimer();
  }
}

function finishTimer() {
  timerStopInterval();
  state.timer.running = false;
  state.timer.remainingMs = 0;
  ui.timerStartBtn.textContent = 'Start';
  const wrap = ui.timerRingProgress.closest('.timer-ring-wrap');
  wrap.classList.remove('running');
  wrap.classList.add('finished');
  ui.timerStatusLabel.textContent = 'Done!';
  renderTimer();
  playSound('timer');
  vibratePattern([300, 150, 300]);
  fireWebNotification('RPG Todo Timer', 'Time is up!');
  showToast('⏱️ Timer finished!', 'success');
}

function renderTimer() {
  if (!ui.timerDisplay) {
    return;
  }
  const remaining = Math.max(0, state.timer.remainingMs);
  ui.timerDisplay.textContent = formatClock(remaining);
  const circumference = 628.32;
  const ratio = state.timer.durationMs > 0 ? remaining / state.timer.durationMs : 0;
  ui.timerRingProgress.style.strokeDashoffset = String(circumference * (1 - ratio));
}

function formatClock(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function stopwatchCurrentElapsed() {
  return state.stopwatch.running
    ? state.stopwatch.elapsedMs + (Date.now() - state.stopwatch.startedAt)
    : state.stopwatch.elapsedMs;
}

function stopwatchToggle() {
  if (state.stopwatch.running) {
    state.stopwatch.elapsedMs = stopwatchCurrentElapsed();
    state.stopwatch.running = false;
    if (state.stopwatch.intervalId) {
      clearInterval(state.stopwatch.intervalId);
      state.stopwatch.intervalId = null;
    }
    ui.stopwatchStartBtn.textContent = 'Resume';
  } else {
    state.stopwatch.running = true;
    state.stopwatch.startedAt = Date.now();
    ui.stopwatchStartBtn.textContent = 'Pause';
    state.stopwatch.intervalId = setInterval(renderStopwatch, 100);
  }
  renderStopwatch();
}

function stopwatchLap() {
  const elapsed = stopwatchCurrentElapsed();
  if (elapsed <= 0) {
    return;
  }
  state.stopwatch.laps.unshift(elapsed);
  playSound('tap');
  renderLaps();
}

function stopwatchReset() {
  if (state.stopwatch.intervalId) {
    clearInterval(state.stopwatch.intervalId);
  }
  state.stopwatch.running = false;
  state.stopwatch.elapsedMs = 0;
  state.stopwatch.startedAt = 0;
  state.stopwatch.intervalId = null;
  state.stopwatch.laps = [];
  ui.stopwatchStartBtn.textContent = 'Start';
  renderStopwatch();
  renderLaps();
}

function renderStopwatch() {
  if (!ui.stopwatchDisplay) {
    return;
  }
  ui.stopwatchDisplay.textContent = formatStopwatch(stopwatchCurrentElapsed());
}

function formatStopwatch(ms) {
  const totalTenths = Math.floor(ms / 100);
  const tenths = totalTenths % 10;
  const totalSeconds = Math.floor(totalTenths / 10);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function renderLaps() {
  if (!ui.lapsList) {
    return;
  }
  if (!state.stopwatch.laps.length) {
    ui.lapsList.innerHTML = '';
    return;
  }
  ui.lapsList.innerHTML = state.stopwatch.laps
    .map((lap, index) => {
      const lapNumber = state.stopwatch.laps.length - index;
      return `<div class="lap-row"><span>Lap ${lapNumber}</span><span>${escapeHtml(formatStopwatch(lap))}</span></div>`;
    })
    .join('');
}

/* ============================================================
   v2.0 — Alarms
   ============================================================ */

function loadAlarms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.alarms);
    state.alarms = raw ? sanitizeAlarms(JSON.parse(raw)) : [];
  } catch (error) {
    state.alarms = [];
  }
}

function saveAlarms() {
  try {
    localStorage.setItem(STORAGE_KEYS.alarms, JSON.stringify(state.alarms));
  } catch (error) {
    showToast('Unable to save alarms. Storage may be full.', 'error');
  }
}

function sanitizeAlarms(alarms) {
  if (!Array.isArray(alarms)) {
    return [];
  }
  const repeatOptions = ['never', 'daily', 'weekdays', 'weekly', 'custom'];
  const soundOptions = ['alarm', 'notification', 'silent'];
  const now = new Date().toISOString();

  return alarms
    .map((alarm) => {
      if (!alarm || typeof alarm !== 'object') {
        return null;
      }
      const day = Array.isArray(alarm.repeatDays)
        ? alarm.repeatDays.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6)
        : [];
      return {
        id: String(alarm.id || createId('alarm')),
        label: String(alarm.label || '').slice(0, 80),
        hour: Math.min(23, Math.max(0, Number(alarm.hour) || 0)),
        minute: Math.min(59, Math.max(0, Number(alarm.minute) || 0)),
        repeatType: repeatOptions.includes(alarm.repeatType) ? alarm.repeatType : 'never',
        repeatDays: day,
        alarmSound: soundOptions.includes(alarm.alarmSound) ? alarm.alarmSound : 'alarm',
        snoozeMinutes: [5, 10, 15].includes(Number(alarm.snoozeMinutes)) ? Number(alarm.snoozeMinutes) : 10,
        vibrationEnabled: alarm.vibrationEnabled !== false,
        enabled: alarm.enabled !== false,
        startDate: alarm.startDate || getLocalDateString(new Date()),
        createdAt: alarm.createdAt || now,
        updatedAt: alarm.updatedAt || now,
      };
    })
    .filter(Boolean);
}

function loadFiredAlarms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.firedAlarms);
    state.firedAlarms = raw ? JSON.parse(raw) : {};
  } catch (error) {
    state.firedAlarms = {};
  }
}

function saveFiredAlarms() {
  try {
    const entries = Object.entries(state.firedAlarms).slice(-60);
    state.firedAlarms = Object.fromEntries(entries);
    localStorage.setItem(STORAGE_KEYS.firedAlarms, JSON.stringify(state.firedAlarms));
  } catch (error) {
    // Non-critical.
  }
}

function hydrateDayPicker() {
  if (!ui.alarmDaysPicker) {
    return;
  }
  ui.alarmDaysPicker.innerHTML = DAY_LABELS.map(
    (day, index) =>
      `<button type="button" class="day-chip" data-day="${index}" aria-pressed="false">${day.short}</button>`
  ).join('');
}

function renderAlarmDays() {
  ui.alarmDaysPicker.querySelectorAll('[data-day]').forEach((chip) => {
    const day = Number(chip.dataset.day);
    const active = state.alarmDraftDays.includes(day);
    chip.classList.toggle('active', active);
    chip.setAttribute('aria-pressed', String(active));
  });
}

function findAlarm(id) {
  return state.alarms.find((alarm) => alarm.id === id);
}

function formatAlarmTime(hour, minute) {
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const meridiem = hour < 12 ? 'AM' : 'PM';
  return `${displayHour}:${String(minute).padStart(2, '0')} ${meridiem}`;
}

function repeatLabel(alarm) {
  if (alarm.repeatType === 'custom') {
    if (!alarm.repeatDays.length) {
      return 'Custom';
    }
    return [...alarm.repeatDays].sort((a, b) => a - b).map((day) => DAY_LABELS[day].short).join(', ');
  }
  return REPEAT_LABELS[alarm.repeatType] || 'Once';
}

function matchesAlarmDay(alarm, date) {
  const weekday = date.getDay();
  switch (alarm.repeatType) {
    case 'daily':
      return true;
    case 'weekdays':
      return weekday >= 1 && weekday <= 5;
    case 'weekly':
      return weekday === (parseDateKey(alarm.startDate) || date).getDay();
    case 'custom':
      return alarm.repeatDays.includes(weekday);
    default:
      return alarm.startDate === getLocalDateString(date);
  }
}

function parseDateKey(key) {
  if (!key || key.length < 10) {
    return null;
  }
  const date = new Date(`${key}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nextFireLabel(alarm) {
  if (!alarm.enabled) {
    return 'Off';
  }
  const now = new Date();
  for (let offset = 0; offset < 8; offset += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (!matchesAlarmDay(alarm, day)) {
      continue;
    }
    const fire = new Date(day);
    fire.setHours(alarm.hour, alarm.minute, 0, 0);
    if (fire.getTime() <= now.getTime()) {
      continue;
    }
    const dayLabel = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : day.toLocaleDateString('en-US', { weekday: 'short' });
    return `${dayLabel} · ${formatAlarmTime(alarm.hour, alarm.minute)}`;
  }
  return 'No upcoming time';
}

function renderAlarms() {
  if (!ui.alarmList) {
    return;
  }
  const alarms = [...state.alarms].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  if (!alarms.length) {
    ui.alarmList.innerHTML = '<div class="empty-state">No alarms yet. Tap “+ New” to create one.</div>';
    return;
  }
  const soundLabels = { alarm: 'Alarm tone', notification: 'Chime', silent: 'Silent' };
  ui.alarmList.innerHTML = alarms
    .map(
      (alarm) => `
      <article class="alarm-card ${alarm.enabled ? '' : 'disabled'}" data-alarm-id="${escapeHtml(alarm.id)}">
        <div class="alarm-card-main">
          <div>
            <div class="alarm-time">${escapeHtml(formatAlarmTime(alarm.hour, alarm.minute))}</div>
            <div class="alarm-label">${escapeHtml(alarm.label || 'Alarm')}</div>
            <div class="alarm-repeat">${escapeHtml(repeatLabel(alarm))} · ${escapeHtml(soundLabels[alarm.alarmSound] || '')}</div>
            <div class="alarm-next">⏭ ${escapeHtml(nextFireLabel(alarm))}</div>
          </div>
          <label class="switch">
            <input type="checkbox" data-action="toggle-alarm" ${alarm.enabled ? 'checked' : ''} aria-label="Enable alarm" />
            <span class="slider"></span>
          </label>
        </div>
        <div class="alarm-actions">
          <button class="mini-button edit-button" type="button" data-action="edit-alarm">Edit</button>
          <button class="mini-button delete-button" type="button" data-action="delete-alarm">Delete</button>
        </div>
      </article>
    `
    )
    .join('');
}

function openAlarmModal(alarmId = null) {
  if (!ui.alarmModal) {
    return;
  }
  ui.alarmForm.reset();
  state.alarmDraftDays = [];

  if (alarmId) {
    const alarm = findAlarm(alarmId);
    if (!alarm) {
      return;
    }
    ui.alarmModalTitle.textContent = 'Edit Alarm';
    ui.alarmId.value = alarm.id;
    ui.alarmTime.value = `${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')}`;
    ui.alarmLabel.value = alarm.label;
    ui.alarmRepeat.value = alarm.repeatType;
    ui.alarmSound.value = alarm.alarmSound;
    ui.alarmSnooze.value = String(alarm.snoozeMinutes);
    ui.alarmVibration.checked = alarm.vibrationEnabled;
    state.alarmDraftDays = [...alarm.repeatDays];
    ui.deleteAlarmButton.hidden = false;
  } else {
    ui.alarmModalTitle.textContent = 'New Alarm';
    ui.alarmId.value = '';
    ui.alarmTime.value = '07:00';
    ui.alarmLabel.value = '';
    ui.alarmRepeat.value = 'daily';
    ui.alarmSound.value = state.settings.soundTone === 'notification' ? 'notification' : 'alarm';
    ui.alarmSnooze.value = '10';
    ui.alarmVibration.checked = true;
    ui.deleteAlarmButton.hidden = true;
  }

  ui.alarmDaysField.hidden = ui.alarmRepeat.value !== 'custom';
  renderAlarmDays();
  updateAlarmNotice();
  showModal('alarmModal');
}

function updateAlarmNotice() {
  const note = reminderPlatformNote();
  ui.alarmNotice.textContent = note;
}

function handleAlarmSubmit(event) {
  event.preventDefault();
  const timeParts = (ui.alarmTime.value || '07:00').split(':');
  const hour = Math.min(23, Math.max(0, Number(timeParts[0]) || 0));
  const minute = Math.min(59, Math.max(0, Number(timeParts[1]) || 0));

  if (ui.alarmRepeat.value === 'custom' && !state.alarmDraftDays.length) {
    showToast('Pick at least one day for a custom alarm.', 'error');
    return;
  }

  const id = ui.alarmId.value || createId('alarm');
  const now = new Date().toISOString();
  const index = state.alarms.findIndex((alarm) => alarm.id === id);

  const alarm = {
    id,
    label: ui.alarmLabel.value.trim(),
    hour,
    minute,
    repeatType: ui.alarmRepeat.value,
    repeatDays: ui.alarmRepeat.value === 'custom' ? [...state.alarmDraftDays] : [],
    alarmSound: ui.alarmSound.value,
    snoozeMinutes: Number(ui.alarmSnooze.value) || 10,
    vibrationEnabled: ui.alarmVibration.checked,
    enabled: index >= 0 ? state.alarms[index].enabled : true,
    startDate: index >= 0 ? state.alarms[index].startDate : getLocalDateString(new Date()),
    createdAt: index >= 0 ? state.alarms[index].createdAt : now,
    updatedAt: now,
  };

  if (index >= 0) {
    state.alarms[index] = alarm;
  } else {
    state.alarms.push(alarm);
  }

  saveAlarms();
  hideModal('alarmModal');
  renderApp();
  playSound('tap');
  syncAlarmsToNative();
  ensureAlarmPermissions();
  showToast(index >= 0 ? 'Alarm updated.' : 'Alarm set.', 'success');
}

function setAlarmEnabled(alarmId, enabled) {
  const alarm = findAlarm(alarmId);
  if (!alarm) {
    return;
  }
  alarm.enabled = enabled;
  alarm.updatedAt = new Date().toISOString();
  saveAlarms();
  renderAlarms();
  renderHomeQuickCounts();
  syncAlarmsToNative();
  showToast(enabled ? 'Alarm on.' : 'Alarm off.', 'neutral');
}

function requestDeleteAlarm(alarmId) {
  const alarm = findAlarm(alarmId);
  if (!alarm) {
    return;
  }
  showConfirmDialog(
    'Delete alarm?',
    `Delete the ${formatAlarmTime(alarm.hour, alarm.minute)} alarm${alarm.label ? ` "${alarm.label}"` : ''}?`,
    () => deleteAlarm(alarmId)
  );
}

function deleteAlarm(alarmId) {
  const alarm = findAlarm(alarmId);
  state.alarms = state.alarms.filter((item) => item.id !== alarmId);
  saveAlarms();
  hideModal('alarmModal');
  renderApp();
  const scheduler = getNativeAlarmScheduler();
  if (scheduler && alarm && typeof scheduler.cancel === 'function') {
    scheduler.cancel({ taskId: alarm.id }).catch(() => undefined);
  }
  showToast('Alarm deleted.', 'neutral');
}

function bindAlarmEvents() {
  if (!ui.alarmList) {
    return;
  }

  ui.newAlarmButton.addEventListener('click', () => openAlarmModal());
  ui.alarmForm.addEventListener('submit', handleAlarmSubmit);
  ui.previewAlarmSound.addEventListener('click', previewAlarmTone);
  ui.alarmRepeat.addEventListener('change', () => {
    ui.alarmDaysField.hidden = ui.alarmRepeat.value !== 'custom';
  });

  ui.alarmDaysPicker.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-day]');
    if (!chip) {
      return;
    }
    const day = Number(chip.dataset.day);
    if (state.alarmDraftDays.includes(day)) {
      state.alarmDraftDays = state.alarmDraftDays.filter((value) => value !== day);
    } else {
      state.alarmDraftDays.push(day);
    }
    renderAlarmDays();
  });

  ui.deleteAlarmButton.addEventListener('click', () => {
    const id = ui.alarmId.value;
    if (id) {
      requestDeleteAlarm(id);
    }
  });

  ui.alarmList.addEventListener('click', (event) => {
    const card = event.target.closest('.alarm-card');
    if (!card) {
      return;
    }
    const id = card.dataset.alarmId;
    if (event.target.closest('[data-action="toggle-alarm"]')) {
      setAlarmEnabled(id, event.target.checked);
      return;
    }
    if (event.target.closest('[data-action="edit-alarm"]')) {
      openAlarmModal(id);
      return;
    }
    if (event.target.closest('[data-action="delete-alarm"]')) {
      requestDeleteAlarm(id);
    }
  });
}

function getNativeAlarmScheduler() {
  return getCapacitorPlugin('AlarmScheduler');
}

async function getAlarmStatus() {
  const scheduler = getNativeAlarmScheduler();
  if (scheduler && typeof scheduler.getStatus === 'function') {
    try {
      const status = await scheduler.getStatus();
      state.nativeAlarmAvailable = true;
      return status;
    } catch (error) {
      // Fall through to web status.
    }
  }
  return {
    available: false,
    platform: 'web',
    notificationsGranted: typeof Notification !== 'undefined' && Notification.permission === 'granted',
    canScheduleExact: false,
  };
}

async function initAlarms() {
  const status = await getAlarmStatus();
  renderAlarmPermissionNote(status);
  if (status.available) {
    await consumeNativeAlarmActions();
    await syncAlarmsToNative();
  } else {
    startWebAlarmWatcher();
  }
}

async function ensureAlarmPermissions() {
  const scheduler = getNativeAlarmScheduler();
  if (scheduler && typeof scheduler.requestPermissions === 'function') {
    try {
      await scheduler.requestPermissions();
    } catch (error) {
      // Permission denied; alarm still schedules, notification may be silent.
    }
    return;
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch (error) {
      // Ignore.
    }
  }
}

async function syncAlarmsToNative() {
  if (!state.nativeAlarmAvailable) {
    return;
  }
  const scheduler = getNativeAlarmScheduler();
  if (!scheduler || typeof scheduler.sync !== 'function') {
    return;
  }
  try {
    const payload = state.alarms.map((alarm) => ({
      id: alarm.id,
      title: alarm.label || 'Alarm',
      description: '',
      reminderEnabled: alarm.enabled,
      repeatType: alarm.repeatType,
      repeatDays: alarm.repeatType === 'custom' ? alarm.repeatDays : [],
      hour: alarm.hour,
      minute: alarm.minute,
      advanceMinutes: 0,
      reminderType: 'alarm',
      alarmSound: alarm.alarmSound,
      vibrationEnabled: alarm.vibrationEnabled,
      snoozeMinutes: alarm.snoozeMinutes,
      startDate: alarm.startDate,
      endDate: '',
    }));
    const result = await scheduler.sync({ tasks: payload });
    renderAlarmPermissionNote(result);
  } catch (error) {
    // Native sync is best-effort; the web watcher covers the app-open case.
  }
}

async function cancelAllNativeAlarms() {
  const scheduler = getNativeAlarmScheduler();
  if (scheduler && typeof scheduler.cancelAll === 'function') {
    try {
      await scheduler.cancelAll();
    } catch (error) {
      // Ignore.
    }
  }
}

async function consumeNativeAlarmActions() {
  const scheduler = getNativeAlarmScheduler();
  if (!scheduler || typeof scheduler.consumeActions !== 'function') {
    return;
  }
  try {
    const result = await scheduler.consumeActions();
    (result.actions || []).forEach((action) => {
      const alarm = findAlarm(action.taskId);
      if (action.type === 'complete') {
        const task = state.tasks.find((item) => item.id === action.taskId);
        if (task) {
          task.completed = true;
          task.completedAt = new Date().toISOString();
          saveTasks();
        }
        if (alarm) {
          alarm.enabled = false;
          saveAlarms();
        }
        showToast('Reminder completed from notification.', 'success');
      } else if (action.type === 'remindersOff' && alarm) {
        alarm.enabled = false;
        saveAlarms();
        showToast('Alarm turned off.', 'neutral');
      }
    });
    renderApp();
  } catch (error) {
    // Ignore.
  }
}

function renderAlarmPermissionNote(status) {
  if (!ui.alarmPermissionNote) {
    return;
  }
  const available = status && status.available;
  if (available) {
    if (status.notificationsGranted === false) {
      ui.alarmPermissionNote.innerHTML =
        'Notifications are off, so alarms will not ring until you allow them. <button type="button" class="link-btn" id="openNotificationSettings">Open settings</button>';
      ui.alarmPermissionNote.hidden = false;
      const button = document.getElementById('openNotificationSettings');
      if (button) {
        button.addEventListener('click', () => {
          const scheduler = getNativeAlarmScheduler();
          if (scheduler && typeof scheduler.openNotificationSettings === 'function') {
            scheduler.openNotificationSettings().catch(() => undefined);
          } else {
            ensureAlarmPermissions();
          }
        });
      }
    } else {
      ui.alarmPermissionNote.hidden = true;
    }
    if (ui.alarmSubtitle) {
      ui.alarmSubtitle.textContent = 'Ring even when the app is closed';
    }
    return;
  }

  ui.alarmPermissionNote.textContent =
    'On this device, alarms ring while RPG Todo is open. Install the Android app to have alarms ring even when it is closed.';
  ui.alarmPermissionNote.hidden = false;
  if (ui.alarmSubtitle) {
    ui.alarmSubtitle.textContent = 'Ring while the app is open';
  }
}

function startWebAlarmWatcher() {
  if (state.webAlarmIntervalId) {
    return;
  }
  checkWebAlarms();
  state.webAlarmIntervalId = setInterval(checkWebAlarms, 15000);
}

function checkWebAlarms() {
  const now = new Date();
  const dateKey = getLocalDateString(now);
  state.alarms.forEach((alarm) => {
    if (!alarm.enabled || !matchesAlarmDay(alarm, now)) {
      return;
    }
    if (now.getHours() !== alarm.hour || now.getMinutes() !== alarm.minute) {
      return;
    }
    const key = `${alarm.id}|${dateKey}|${alarm.hour}:${alarm.minute}`;
    if (state.firedAlarms[key]) {
      return;
    }
    state.firedAlarms[key] = Date.now();
    saveFiredAlarms();
    ringAlarm(alarm);
  });
}

function ringAlarm(alarm) {
  if (state.ringingAlarmId) {
    return;
  }
  state.ringingAlarmId = alarm.id;
  ui.ringingTitle.textContent = alarm.label || 'Alarm';
  ui.ringingTime.textContent = formatAlarmTime(alarm.hour, alarm.minute);
  ui.ringingOverlay.hidden = false;
  if (alarm.alarmSound !== 'silent') {
    startAlarmLoop();
  }
  if (alarm.vibrationEnabled) {
    vibratePattern([500, 250, 500, 250, 500]);
  }
  playSound('notification');
  fireWebNotification('RPG Todo Alarm', `${alarm.label || 'Alarm'} · ${formatAlarmTime(alarm.hour, alarm.minute)}`);
}

function stopRinging() {
  stopAlarmLoop();
  state.ringingAlarmId = null;
  ui.ringingOverlay.hidden = true;
}

function snoozeRinging() {
  const alarm = findAlarm(state.ringingAlarmId);
  if (!alarm) {
    stopRinging();
    return;
  }
  const minutes = alarm.snoozeMinutes;
  stopRinging();
  showToast(`Snoozed for ${minutes} minutes.`, 'neutral');
  setTimeout(() => ringAlarm(alarm), minutes * 60000);
}

/* ============================================================
   v2.0 — Quick add & home counts
   ============================================================ */

function bindQuickAddEvents() {
  ui.quickAddButton.addEventListener('click', () => {
    const scheduler = getCapacitorPlugin('AlarmScheduler');
    state.nativeAlarmAvailable = state.nativeAlarmAvailable || Boolean(scheduler);
    showModal('quickAddModal');
  });

  ui.quickAddModal.addEventListener('click', (event) => {
    const option = event.target.closest('[data-create]');
    if (!option) {
      return;
    }
    const choice = option.dataset.create;
    hideModal('quickAddModal');
    if (choice === 'task') {
      openTaskModal();
    } else if (choice === 'note') {
      openNoteModal();
    } else if (choice === 'alarm') {
      openAlarmModal();
    }
  });
}

function bindQuickTargets() {
  document.querySelectorAll('[data-quick-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.quickTarget;
      if (target === 'note') {
        setActiveNav('notes');
        openNoteModal();
      } else if (target === 'timer') {
        setActiveNav('timer');
      } else if (target === 'alarm') {
        setActiveNav('alarms');
      }
    });
  });
}

function renderHomeQuickCounts() {
  if (ui.homeNoteCount) {
    ui.homeNoteCount.textContent = `${state.notes.length} saved`;
  }
  if (ui.homeAlarmCount) {
    const active = state.alarms.filter((alarm) => alarm.enabled).length;
    ui.homeAlarmCount.textContent = `${active} set`;
  }
}

/* ============================================================
   v2.0 — Settings panels
   ============================================================ */

function renderSoundSettingsPanel(detail) {
  detail.classList.remove('hidden');
  detail.innerHTML = `
    <div class="toggle-row">
      <label for="soundToggle">App sounds</label>
      <label class="switch">
        <input id="soundToggle" type="checkbox" ${state.settings.soundEnabled ? 'checked' : ''} />
        <span class="slider"></span>
      </label>
    </div>
    <div class="field-group">
      <label for="soundVolumeInput">Volume: <span id="soundVolumeValue">${escapeHtml(String(state.settings.soundVolume))}%</span></label>
      <input id="soundVolumeInput" type="range" min="0" max="100" value="${escapeHtml(String(state.settings.soundVolume))}" />
    </div>
    <div class="field-group">
      <label for="soundToneInput">Alarm tone</label>
      <select id="soundToneInput">
        <option value="alarm" ${state.settings.soundTone === 'alarm' ? 'selected' : ''}>Classic alarm</option>
        <option value="notification" ${state.settings.soundTone === 'notification' ? 'selected' : ''}>Soft chime</option>
        <option value="digital" ${state.settings.soundTone === 'digital' ? 'selected' : ''}>Digital beep</option>
      </select>
    </div>
    <div class="modal-actions">
      <button type="button" class="secondary-btn" id="testSoundButton">Test</button>
      <button type="button" class="primary-btn" id="saveSoundSettings">Save</button>
    </div>
  `;

  const volumeInput = document.getElementById('soundVolumeInput');
  volumeInput.addEventListener('input', () => {
    document.getElementById('soundVolumeValue').textContent = `${volumeInput.value}%`;
  });

  document.getElementById('testSoundButton').addEventListener('click', () => {
    state.settings.soundVolume = Number(volumeInput.value);
    state.settings.soundEnabled = document.getElementById('soundToggle').checked;
    state.settings.soundTone = document.getElementById('soundToneInput').value;
    playSound('alarm');
  });

  document.getElementById('saveSoundSettings').addEventListener('click', () => {
    state.settings.soundEnabled = document.getElementById('soundToggle').checked;
    state.settings.soundVolume = Number(volumeInput.value || 70);
    state.settings.soundTone = document.getElementById('soundToneInput').value;
    saveSettings();
    detail.classList.add('hidden');
    showToast('Sound settings saved.', 'success');
  });
}

async function renderAlarmSettingsPanel(detail) {
  detail.classList.remove('hidden');
  detail.innerHTML = '<p class="notice-text">Checking alarm support…</p>';
  const status = await getAlarmStatus();

  if (status.available) {
    detail.innerHTML = `
      <div class="detail-item">
        <span>Platform</span>
        <strong>Android (native alarms)</strong>
      </div>
      <div class="detail-item">
        <span>Notifications</span>
        <strong>${status.notificationsGranted ? 'Allowed' : 'Not allowed'}</strong>
      </div>
      <div class="detail-item">
        <span>Exact alarms</span>
        <strong>${status.canScheduleExact ? 'Allowed' : 'Not granted'}</strong>
      </div>
      <div class="modal-actions">
        <button type="button" class="secondary-btn" id="requestNotificationPermission">Notifications</button>
        <button type="button" class="secondary-btn" id="openExactAlarmPermission">Exact alarms</button>
      </div>
    `;
    document.getElementById('requestNotificationPermission').addEventListener('click', async () => {
      await ensureAlarmPermissions();
      renderAlarmSettingsPanel(detail);
    });
    document.getElementById('openExactAlarmPermission').addEventListener('click', () => {
      const scheduler = getNativeAlarmScheduler();
      if (scheduler && typeof scheduler.openExactAlarmSettings === 'function') {
        scheduler.openExactAlarmSettings().catch(() => undefined);
      }
    });
    return;
  }

  detail.innerHTML = `
    <div class="detail-item">
      <span>Platform</span>
      <strong>Web / PWA</strong>
    </div>
    <p class="notice-text">Alarms and timer alerts ring while the app is open. In the installed Android app, alarms ring through the device’s alarm channel even when the app is closed.</p>
    <div class="modal-actions">
      <button type="button" class="primary-btn" id="enableWebNotifications">Enable Notifications</button>
    </div>
  `;
  document.getElementById('enableWebNotifications').addEventListener('click', async () => {
    await ensureAlarmPermissions();
    renderAlarmSettingsPanel(detail);
  });
}