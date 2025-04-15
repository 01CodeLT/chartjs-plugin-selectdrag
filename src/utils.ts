import { Selection } from "./selection";

export function getOptions(chart) {
    return Object.assign({}, {
        output: 'label',
        highlight: true,
        colors: {
            selection: "#e8eff6",
            selected: "#1f77b4", // Unused if backgroundColorDefault set on dataset
            unselected: "#cccccc"
        }
    }, chart?.config?.options?.plugins?.selectdrag);
}

export function highlightChartData(chart, selection: Selection = null) {
    // Get plugin options
    const pluginOptions = getOptions(chart);

    // Color based on output
    const output = pluginOptions.output;
    const colors = pluginOptions.colors;
    const backgroundColorCallback = {
        'label': (value, index, defaultColor) => {
            // Show selected/unselected
            if(index >= selection.values._start.axisIndex && index <= selection.values._end?.axisIndex) {
                return defaultColor;
            } else {
                return colors.unselected;
            }
        }, 
        'value': (value, index, defaultColor) => {
            // Show selected/unselected
            const v = value.x || value;
            if(v >= selection.values._start?.axisValue && v <= selection.values._end?.axisValue) {
                return defaultColor;
            } else {
                return colors.unselected;
            }
        }
    }[output];

    // Set highlighted
    chart.data.datasets = chart.data.datasets.map((dataset) => {
        dataset.backgroundColor = (
            output == 'value' ? dataset.data : chart.data.labels
        ).map((value, index) => {
            if(!selection || !selection?.selection.start?.x || !selection?.selection.end?.x) {
                // Show default
                return dataset.backgroundColorDefault || colors.selected;
            } else {
                // Show selected/unselected
                return backgroundColorCallback(value, index, dataset.backgroundColorDefault || colors.selected);
            }
        });
        return dataset;
    });
}