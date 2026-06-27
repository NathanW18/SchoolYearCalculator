class SchoolYearTracker {
  constructor() {
    this.trackerView = document.getElementById('tracker-view');
    this.setupView = document.getElementById('setup-view');

    this.displayStart = document.getElementById('display-start');
    this.displayEnd = document.getElementById('display-end');
    this.progressBar = document.getElementById('progressFill');
    this.resultDiv = document.getElementById('result');
    this.timeRemaining = document.getElementById('time-remaining');
    this.businessDaysLeft = document.getElementById('business-days-left');
    this.milestonesList = document.getElementById('milestones');
    this.termLabel = document.getElementById('term-label');
    this.statusLabel = document.getElementById('status-label');

    this.startDateInput = document.getElementById('start-date-input');
    this.endDateInput = document.getElementById('end-date-input');
    this.termLabelInput = document.getElementById('term-label-input');
    this.savedTermSelect = document.getElementById('saved-term-select');

    this.saveBtn = document.getElementById('save-btn');
    this.editBtn = document.getElementById('edit-btn');
    this.clearBtn = document.getElementById('clear-btn');
    this.cancelBtn = document.getElementById('cancel-btn');
    this.deleteBtn = document.getElementById('delete-btn');

    this.timerId = null;
    this.currentTermId = null;
    this.currentTerm = null;

    this.attachEventListeners();
    this.loadState();
  }

  attachEventListeners() {
    this.saveBtn.addEventListener('click', () => this.saveTerm());
    this.editBtn.addEventListener('click', () => this.showSetup());
    this.clearBtn.addEventListener('click', () => this.clearSavedTerms());
    this.cancelBtn.addEventListener('click', () => this.showTracker());
    this.deleteBtn.addEventListener('click', () => this.deleteCurrentTerm());
    this.savedTermSelect.addEventListener('change', () => this.loadSelectedTerm());
  }

  loadState() {
    chrome.storage.local.get(['schoolTerms', 'selectedTermId'], (result) => {
      const terms = Array.isArray(result.schoolTerms) ? result.schoolTerms : [];
      this.terms = terms;
      this.currentTermId = result.selectedTermId || null;
      this.renderTermOptions();

      const activeTerm = this.terms.find((term) => term.id === this.currentTermId) || terms[0];
      if (activeTerm) {
        this.selectTerm(activeTerm.id);
        this.showTracker();
      } else {
        this.showSetup();
      }
    });
  }

  generateId() {
    return `term-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  renderTermOptions() {
    this.savedTermSelect.innerHTML = '';
    const newOption = document.createElement('option');
    newOption.value = '';
    newOption.textContent = 'Create new term';
    this.savedTermSelect.appendChild(newOption);

    this.terms.forEach((term) => {
      const option = document.createElement('option');
      option.value = term.id;
      option.textContent = `${term.label || 'Untitled term'} (${term.start} → ${term.end})`;
      this.savedTermSelect.appendChild(option);
    });

    this.savedTermSelect.value = this.currentTermId || '';
    this.updateDeleteVisibility();
  }

  updateDeleteVisibility() {
    const showDelete = !!this.currentTerm && !!this.currentTerm.id;
    this.deleteBtn.classList.toggle('hidden', !showDelete);
  }

  loadSelectedTerm() {
    const selectedId = this.savedTermSelect.value;
    if (!selectedId) {
      this.currentTermId = null;
      this.currentTerm = null;
      this.termLabelInput.value = '';
      this.startDateInput.value = '';
      this.endDateInput.value = '';
      this.updateDeleteVisibility();
      return;
    }

    this.selectTerm(selectedId);
    if (this.currentTerm) {
      this.termLabelInput.value = this.currentTerm.label;
      this.startDateInput.value = this.currentTerm.start;
      this.endDateInput.value = this.currentTerm.end;
    }
    this.updateDeleteVisibility();
  }

  selectTerm(termId) {
    const selectedTerm = this.terms.find((term) => term.id === termId);
    if (!selectedTerm) {
      this.currentTerm = null;
      return;
    }
    this.currentTerm = selectedTerm;
    this.currentTermId = selectedTerm.id;
    chrome.storage.local.set({ selectedTermId: selectedTerm.id });
    this.updateDeleteVisibility();
  }

  saveTerm() {
    const label = this.termLabelInput.value.trim() || 'Custom school year';
    const start = this.startDateInput.value;
    const end = this.endDateInput.value;

    if (!start || !end) {
      alert('Please choose both a start date and an end date.');
      return;
    }

    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    if (startDate >= endDate) {
      alert('End date must be later than the start date.');
      return;
    }

    const term = {
      id: this.currentTermId || this.generateId(),
      label,
      start,
      end,
      createdAt: new Date().toISOString(),
    };

    const existingIndex = this.terms.findIndex((item) => item.id === term.id);
    if (existingIndex >= 0) {
      this.terms[existingIndex] = term;
    } else {
      this.terms.unshift(term);
    }

    this.currentTerm = term;
    this.currentTermId = term.id;
    chrome.storage.local.set({ schoolTerms: this.terms, selectedTermId: term.id }, () => {
      this.renderTermOptions();
      this.showTracker();
    });
  }

  deleteCurrentTerm() {
    if (!this.currentTerm) {
      return;
    }

    const confirmed = confirm('Delete this saved term?');
    if (!confirmed) {
      return;
    }

    this.terms = this.terms.filter((term) => term.id !== this.currentTerm.id);
    this.currentTerm = null;
    this.currentTermId = null;

    const selectedTermId = this.terms.length ? this.terms[0].id : null;
    chrome.storage.local.set({ schoolTerms: this.terms, selectedTermId }, () => {
      this.currentTermId = selectedTermId;
      this.renderTermOptions();
      if (selectedTermId) {
        this.selectTerm(selectedTermId);
        this.showTracker();
      } else {
        this.showSetup();
      }
    });
  }

  clearSavedTerms() {
    const confirmed = confirm('Remove all saved terms and reset the tracker?');
    if (!confirmed) {
      return;
    }

    this.terms = [];
    this.currentTerm = null;
    this.currentTermId = null;
    chrome.storage.local.clear(() => {
      this.showSetup();
    });
  }

  showTracker() {
    if (!this.currentTerm) {
      this.showSetup();
      return;
    }

    this.setupView.classList.add('hidden');
    this.trackerView.classList.remove('hidden');
    this.renderTracker();
    this.startTimer();
  }

  showSetup() {
    this.trackerView.classList.add('hidden');
    this.setupView.classList.remove('hidden');

    if (this.currentTerm) {
      this.savedTermSelect.value = this.currentTerm.id;
      this.termLabelInput.value = this.currentTerm.label;
      this.startDateInput.value = this.currentTerm.start;
      this.endDateInput.value = this.currentTerm.end;
      this.updateDeleteVisibility();
    } else {
      this.savedTermSelect.value = '';
      this.termLabelInput.value = '';
      this.startDateInput.value = '';
      this.endDateInput.value = '';
      this.updateDeleteVisibility();
    }
  }

  startTimer() {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
    this.updateTracker();
  }

  stopTimer() {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
  }

  renderTracker() {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    this.termLabel.textContent = this.currentTerm.label;
    this.displayStart.textContent = new Date(`${this.currentTerm.start}T00:00:00`).toLocaleDateString(undefined, options);
    this.displayEnd.textContent = new Date(`${this.currentTerm.end}T00:00:00`).toLocaleDateString(undefined, options);
    this.statusLabel.textContent = 'Live progress for your current academic term';
  }

  updateTracker() {
    if (!this.currentTerm) {
      return;
    }

    const now = new Date();
    const startDate = new Date(`${this.currentTerm.start}T00:00:00`);
    const endDate = new Date(`${this.currentTerm.end}T00:00:00`);
    const totalMs = endDate - startDate;
    const elapsedMs = now - startDate;
    const remainingMs = endDate - now;

    const progress = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));
    this.progressBar.style.width = `${progress}%`;

    if (now < startDate) {
      this.statusLabel.textContent = 'Term has not started yet.';
      this.timeRemaining.textContent = this.formatDuration(startDate - now) + ' until start';
      this.businessDaysLeft.textContent = this.countBusinessDays(startDate, endDate) + ' total';
      this.resultDiv.textContent = `Progress: 0.00%`;
    } else if (now >= endDate) {
      this.statusLabel.textContent = 'This term is complete.';
      this.timeRemaining.textContent = 'Complete';
      this.businessDaysLeft.textContent = '0 remaining';
      this.resultDiv.textContent = `Progress: 100.00%`;
    } else {
      this.statusLabel.textContent = 'Term is in progress.';
      this.timeRemaining.textContent = this.formatDuration(remainingMs) + ' left';
      this.businessDaysLeft.textContent = this.countBusinessDays(now, endDate) + ' remaining';
      this.resultDiv.textContent = `Progress: ${progress.toFixed(2)}%`;
    }

    this.renderMilestones(startDate, endDate, now);
    this.timerId = setTimeout(() => this.updateTracker(), 1000);
  }

  renderMilestones(startDate, endDate, now) {
    const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
    const options = { month: 'short', day: 'numeric' };
    const milestones = [];

    milestones.push({ label: 'Starts', value: startDate.toLocaleDateString(undefined, options) });
    milestones.push({ label: 'Halfway', value: midpoint.toLocaleDateString(undefined, options) });
    milestones.push({ label: 'Ends', value: endDate.toLocaleDateString(undefined, options) });

    if (now < startDate) {
      milestones.unshift({ label: 'Next', value: 'Starts soon' });
    } else if (now >= endDate) {
      milestones.unshift({ label: 'Status', value: 'Finished' });
    } else {
      milestones.unshift({ label: 'Current', value: `Day ${this.getOrdinalDay(now, startDate)}` });
    }

    this.milestonesList.innerHTML = milestones
      .map((item) => `<li><strong>${item.label}:</strong> ${item.value}</li>`)
      .join('');
  }

  getOrdinalDay(current, start) {
    const days = Math.floor((current - start) / (1000 * 60 * 60 * 24)) + 1;
    return `${days}${this.getOrdinalSuffix(days)}`;
  }

  getOrdinalSuffix(number) {
    const tens = number % 100;
    if (tens >= 11 && tens <= 13) return 'th';
    switch (number % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours || days) parts.push(`${hours}h`);
    if (minutes || hours || days) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
  }

  countBusinessDays(startDate, endDate) {
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    let count = 0;
    while (start < end) {
      const day = start.getDay();
      if (day !== 0 && day !== 6) {
        count += 1;
      }
      start.setDate(start.getDate() + 1);
    }
    return count;
  }
}

document.addEventListener('DOMContentLoaded', () => new SchoolYearTracker());
