async function loadCSV(url) {
  const text = await fetch(url).then(res => res.text());
  const lines = text.split('\n').slice(2).join('\n');
  return new Promise((resolve, reject) => {
    Papa.parse(lines, {
      header: true,
      skipEmptyLines: true,
      complete: results => resolve(results.data),
      error: err => reject(err)
    });
  });
}

async function runAllYearsRegression() {
  const years = Array.from({length: 10}, (_, i) => 2010 + i);
  const diabetesFiles = years.map(y => `data/DiabetesAtlasData (${y}).csv`);
  const allData = await Promise.all(diabetesFiles.map(loadCSV));

  // Change these if your column names are different
  const diabetesCol = "Percentage";
  const obesityCol = "Obesity";

  // Prepare regression data for each year
  const regressions = years.map((year, idx) => {
    const data = allData[idx];
    const points = data
      .filter(d => d[diabetesCol] && d[obesityCol])
      .map(d => ({
        x: parseFloat(d[obesityCol]),
        y: parseFloat(d[diabetesCol]),
        state: d.State
      }))
      .filter(d => !isNaN(d.x) && !isNaN(d.y));

    if (points.length === 0) return null;

    // Linear regression (least squares)
    const n = points.length;
    const sumX = points.reduce((acc, d) => acc + d.x, 0);
    const sumY = points.reduce((acc, d) => acc + d.y, 0);
    const sumXY = points.reduce((acc, d) => acc + d.x * d.y, 0);
    const sumXX = points.reduce((acc, d) => acc + d.x * d.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const xVals = points.map(d => d.x);
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);

    return {
      year,
      points,
      regression: {
        x: [minX, maxX],
        y: [slope * minX + intercept, slope * maxX + intercept],
        slope,
        intercept
      }
    };
  });

  // Create dropdown for years
  const regressionDiv = document.getElementById('regression');
  regressionDiv.innerHTML = `
    <label for="regYear">Select Year:</label>
    <select id="regYear">${years.map(y => `<option value="${y}">${y}</option>`)}</select>
    <div id="regPlot"></div>
  `;

  function plotYear(yearIdx) {
    const reg = regressions[yearIdx];
    if (!reg) {
      Plotly.newPlot('regPlot', [], {title: `No data for ${years[yearIdx]}`});
      return;
    }
    const scatter = {
      x: reg.points.map(d => d.x),
      y: reg.points.map(d => d.y),
      text: reg.points.map(d => d.state),
      mode: 'markers',
      type: 'scatter',
      name: 'States'
    };
    const regLine = {
      x: reg.regression.x,
      y: reg.regression.y,
      mode: 'lines',
      name: 'Regression Line',
      line: { color: 'red' }
    };
    Plotly.newPlot('regPlot', [scatter, regLine], {
      title: `Linear Regression: Diabetes vs. Obesity (${reg.year})`,
      xaxis: { title: 'Obesity Rate (%)' },
      yaxis: { title: 'Diabetes Rate (%)' }
    });
  }

  // Initial plot
  plotYear(0);

  // Change plot on dropdown
  document.getElementById('regYear').addEventListener('change', function() {
    plotYear(this.selectedIndex);
  });
}

document.addEventListener('DOMContentLoaded', runAllYearsRegression);