document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const trackerView = document.getElementById('tracker-view');
  const setupView = document.getElementById('setup-view');
  
  const displayStart = document.getElementById('display-start');
  const displayEnd = document.getElementById('display-end');
  const progressBar = document.getElementById('progressFill');
  const resultDiv = document.getElementById('result');
  
  const startDateInput = document.getElementById('start-date-input');
  const endDateInput = document.getElementById('end-date-input');
  
  const saveBtn = document.getElementById('save-btn');
  const editBtn = document.getElementById('edit-btn');
  const cancelBtn = document.getElementById('cancel-btn');

  let startDate, endDate, totalTime;
  let timerId = null;

  // Load saved dates from Chrome Storage
  chrome.storage.local.get(['schoolStart', 'schoolEnd'], function(result) {
    if (result.schoolStart && result.schoolEnd) {
      initTracker(result.schoolStart, result.schoolEnd);
    } else {
      showSetup(false); // Show setup screen, hide cancel button
    }
  });

  // Save button click
  saveBtn.addEventListener('click', function() {
    const startVal = startDateInput.value;
    const endVal = endDateInput.value;

    if (!startVal || !endVal) {
      alert('Please select both start and end dates.');
      return;
    }

    if (new Date(startVal) >= new Date(endVal)) {
      alert('End date must be after the start date.');
      return;
    }

    // Save to Chrome Storage
    chrome.storage.local.set({ schoolStart: startVal, schoolEnd: endVal }, function() {
      initTracker(startVal, endVal);
    });
  });

  // Edit button click
  editBtn.addEventListener('click', function() {
    showSetup(true); // Show setup screen with cancel button enabled
  });

  // Cancel button click
  cancelBtn.addEventListener('click', function() {
    setupView.classList.add('hidden');
    trackerView.classList.remove('hidden');
  });

  function initTracker(startIsoStr, endIsoStr) {
    // Stop any existing loop if user is re-saving new dates
    if (timerId) clearTimeout(timerId);

    startDate = new Date(startIsoStr + 'T00:00:00');
    endDate = new Date(endIsoStr + 'T00:00:00');
    totalTime = endDate - startDate;

    // Format options for friendly display labels
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    displayStart.textContent = startDate.toLocaleDateString(undefined, options);
    displayEnd.textContent = endDate.toLocaleDateString(undefined, options);

    // Pre-populate input elements in case they edit later
    startDateInput.value = startIsoStr;
    endDateInput.value = endIsoStr;

    // UI swap
    setupView.classList.add('hidden');
    trackerView.classList.remove('hidden');

    // Run the live update loop
    updatePercentage();
  }

  function showSetup(allowCancel) {
    trackerView.classList.add('hidden');
    setupView.classList.remove('hidden');
    
    if (allowCancel) {
      cancelBtn.classList.remove('hidden');
    } else {
      cancelBtn.classList.add('hidden');
    }
  }

  function updatePercentage() {
    const currentTime = new Date();
    const elapsedTime = currentTime - startDate;
    
    let percentage = (elapsedTime / totalTime) * 100;
    percentage = Math.max(0, Math.min(100, percentage));

    progressBar.style.width = percentage + '%';
    resultDiv.textContent = `Progress: ${percentage.toFixed(5)}%`;

    timerId = setTimeout(updatePercentage, 1000);
  }
});
