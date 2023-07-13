# Chart JS Plugin Select Drag
Chartjs plugin which allows you to select a range of data by dragging over a chart, see example https://stackblitz.com/edit/chartjs-selectdrag?file=index.html

### Usage

Register the plugin with chart js...
```
import Chart from "chart.js/auto";
import SelectDragPlugin from "@01coder/chartjs-plugin-selectdrag";
Chart.register(SelectDragPlugin);
```

Enable it in the settings of a chart
```
type: "bar",
options: {
  plugins: {
      selectdrag: {
          enabled: true,
          onSelectComplete: (event) => {
              // Show selected
              document.getElementById('results').innerHTML = event.range;

              // Get selected range
              console.log(event.range);
              
              // Get selection coordinates
              console.log(event.boundingBox);
          }
      }
  },
},
data: { 
    labels: [], 
    datasets: []
}
```

*Please note: This package is yet to be fully reviewed and tested, furthermore changes need to be made for other charts and selection types...*
