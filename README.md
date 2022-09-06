# chartjs-plugin-selectdrag
Chartjs plugin which allows you to select a range of data by dragging over a chart

### Usage

Register the plugin with chart js...
```
import Chart from "chart.js/auto";
import SelectDragPlugin from "chartjs-plugin-selectdrag;
Chart.register(SelectDragPlugin);
```

Enable it in the settings of a chart
```
{
    type: "bar",
    options: {
        plugins: {
            selectdrag: {
                enabled: true,
                onSelectComplete: (event) => { 
                    // Get selected range
                    console.log(event.range);
                    
                    // Get selection coordinates
                    console.log(event.boundingBox);
                }
            }
        },
    },
    data: { labels: [], datasets: [] }
});

```

*Please note: This package is yet to be fully reviewed and tested, furthermore changes need to be made for other charts and selection types...*