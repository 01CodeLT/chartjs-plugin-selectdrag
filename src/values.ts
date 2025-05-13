import { getOptions } from "./utils";

interface Point { x: number; y: number; }

export class Values {

    _start = { axisIndex: null, axisValue: null };
    _end = { axisIndex: null, axisValue: null };

    start(chart, point: Point): { axisIndex: any, axisValue: any } {
        // Get plugin options
        const pluginOptions = getOptions(chart);
        const output = pluginOptions.output;
        
        // Return output
        return ({
            'label': () => {
                const value = chart.scales.x.getLabelForValue(chart.scales.x.getValueForPixel(point.x));
                this._start = {
                    axisIndex: chart.data.labels.indexOf(value),
                    axisValue: value
                };
            },
            'value': () => {
                // Get value by scale
                this._start = { axisValue: chart.scales.x.getValueForPixel(point.x), axisIndex: null };
            },
        })[output]();
    }

    end(chart, point: Point): { axisIndex: any, axisValue: any } {
        // Get plugin options
        const pluginOptions = getOptions(chart);
        const output = pluginOptions.output;

        // Return output
        return ({
            'label': () => {
                // Get value by label
                let value = chart.scales.x.getLabelForValue(chart.scales.x.getValueForPixel(point.x));
                if(chart.data.labels.includes(value)) {
                    this._end = { axisValue: value, axisIndex: chart.data.labels.indexOf(value) };
                } else {
                    // User must have selected over end
                    this._end = { 
                        axisValue: chart.data.labels[chart.data.labels.length - 1], 
                        axisIndex: chart.data.labels.length - 1 
                    };
                }
            },
            'value': () => {
                // Get value by scale
                const axisValue = chart.scales.x.getValueForPixel(point.x);
                this._end = { axisValue, axisIndex: null };
            }
        })[output]();
    }

    setRange(chart, range = []) {
        const pluginOptions = getOptions(chart);
        const getValue = {
            'label': (v) => {
                const axisIndex = chart.data.labels.findIndex((item) => item === v);
                return { axisIndex, axisValue: chart.data.labels[axisIndex] };
            }, 
            'value': (v) => {
                return { axisIndex: null, axisValue: (v !== undefined && v.x) ? v.x : v };
            }
        }[pluginOptions.output];

        // Set start and end
        this._start = getValue(range[0]); this._end = getValue(range[1]);
    }

    getRange() {
        if(this._start.axisValue && this._end.axisValue) {
            return [this._start.axisValue, this._end.axisValue]
        } else { 
            return [];
        }
    }
}