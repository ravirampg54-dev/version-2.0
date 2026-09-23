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

const priorities = ['Low', 'Medium', 'High'];

let state = {
  tasks: [],
  activeNav: 'home',
  activeFilter: 'all',
  searchTerm: '',
  selectedTheme: 'theme-light',
  settings: { ...defaultSettings },
  openModal: null,
  deferredInstallPrompt: null,
  savingTask: false,
  lastFocusedElement: null,
  modalOpenCount: 0,
  suppressNextPop: false,
  notifiedReminderIds: new Set(),
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
  registerServiceWorker();
  initInstallPrompt();
  initNativeBridge();
  initConnectionStatus();
  syncAllReminders();
  startReminderWatcher();
  initHistoryHandling();
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
  ui.dismissInstallBanner.addEventListener('click', () => {
    ui.installBanner.hidden = true;
  });

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
    case 'export-tasks':
      exportTasks();
      break;
    case 'import-tasks':
      importTasks();
      break;
    case 'clear-tasks':
      if (state.tasks.length) {
        showConfirmDialog(
          'Clear all tasks?',
          'This will permanently delete all tasks. This action cannot be undone.',
          () => {
            state.tasks = [];
            saveTasks();
            clearAllReminders();
            renderApp();
            showToast('All tasks cleared.', 'neutral');
          }
        );
      } else {
        showToast('No tasks to clear.', 'neutral');
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
  const content = JSON.stringify(state.tasks, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'rpg-todo-tasks.json';
  link.click();
  URL.revokeObjectURL(url);
  showToast('Tasks exported.', 'success');
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
        const cleaned = sanitizeTasks(parsed);
        if (!Array.isArray(cleaned)) {
          throw new Error('Invalid task export');
        }
        state.tasks = cleaned;
        saveTasks();
        syncAllReminders();
        renderApp();
        showToast(`Imported ${cleaned.length} tasks.`, 'success');
      } catch (error) {
        showToast('Import failed. Please choose a valid RPG Todo JSON export.', 'error');
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
  const isNative = isNativePlatform();
  if (isNative) {
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .then((registration) => {
        registration.update();
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  });
}

function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    ui.installSettingItem.hidden = false;
    ui.installSettingText.textContent = 'Install App';
    showInstallBannerIfWeb();
  });

  window.addEventListener('appinstalled', () => {
    state.deferredInstallPrompt = null;
    ui.installBanner.hidden = true;
    ui.installSettingItem.hidden = true;
    showToast('App installed. Find RPG Todo on your home screen.', 'success');
  });

  if (isIosSafari() && !window.navigator.standalone) {
    ui.installSettingItem.hidden = false;
    ui.installSettingText.textContent = 'How to Install';
  }
}

function showInstallBannerIfWeb() {
  const dismissed = localStorage.getItem('rpgTodoInstallDismissed');
  if (dismissed !== '1' && !isNativePlatform() && !isStandalone()) {
    ui.installBanner.hidden = false;
  }
}

async function handleInstallClick() {
  if (state.deferredInstallPrompt) {
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    ui.installBanner.hidden = true;
    ui.installSettingItem.hidden = true;
    return;
  }

  if (isIosSafari() && !isStandalone()) {
    showConfirmDialog(
      'Install on iPhone/iPad',
      'Tap the Share button (square with arrow), then choose "Add to Home Screen". RPG Todo will appear like a native app on your home screen.'
    );
    return;
  }

  showToast('Install is available from your browser\u2019s menu (Add to Home Screen).', 'neutral');
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