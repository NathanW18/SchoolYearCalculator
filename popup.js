document.addEventListener('DOMContentLoaded', function() {
  const startDate = new Date('2023-09-05T00:00:00');
  const endDate = new Date('2024-06-20T00:00:00');
  const totalTime = endDate - startDate;

  const progressBar = document.getElementById('progressFill');
  const resultDiv = document.getElementById('result');

const updatePercentage = () => {
  const currentTime = new Date();
  const elapsedTime = currentTime - startDate;
  
  let percentage = (elapsedTime / totalTime) * 100;
  percentage = Math.max(0, Math.min(100, percentage));

  progressBar.style.width = percentage + '%';
  resultDiv.textContent = `Progress: ${percentage.toFixed(5)}%`;

  setTimeout(updatePercentage, 1000);
};

  // Initial call to update the percentage
  updatePercentage();
});
