import { getOptions } from "./utils";

export class Values {

    _start = { axisIndex: null, axisValue: null };
    _end = { axisIndex: null, axisValue: null };

    start(chart, e): { axisIndex: any, axisValue: any } {
        // Get plugin options
        const pluginOptions = getOptions(chart);
        const output = pluginOptions.output;
        console.log(chart, e);
        // Return output
        return ({
            'label': () => {
                const axisIndex = chart.getElementsAtEventForMode(e, "index", { intersect: false })[0].index;
                this._start = { axisIndex, axisValue: chart.data.labels[axisIndex] };
            },
            'value': () => {
                // Get value by scale
                this._start = { axisIndex: null, axisValue: chart.scales.x.getValueForPixel(e.offsetX) };
            },
        })[output]();
    }

    end(chart, e): { axisIndex: any, axisValue: any } {
        // Get plugin options
        const pluginOptions = getOptions(chart);
        const output = pluginOptions.output;

        // Return output
        return ({
            'label': () => {
                // Get value by label
                const axisElements = chart.getElementsAtEventForMode(e, "index", { intersect: false });
                const axisIndex = axisElements.length > 0 ? axisElements[0].index : chart.data.labels.length - 1;
                this._end = { axisValue: chart.data.labels[axisIndex], axisIndex };
            },
            'value': () => {
                // Get value by scale
                const axisValue = chart.scales.x.getValueForPixel(e.offsetX);
                this._end = { axisValue, axisIndex: null };
            }
        })[output]();
    }

    swap() {
        const startValues = JSON.parse(JSON.stringify(this._start));
        const endValues = JSON.parse(JSON.stringify(this._end));
        this._end = startValues; this._start = endValues;
    }

    setRange(chart, range = []) {
        const pluginOptions = getOptions(chart);
        const getValue = {
            'label': (v) => {
                const axisIndex = chart.data.labels.findIndex((item) => item === v);
                return { axisIndex, axisValue: chart.data.labels[axisIndex] };
            }, 
            'value': (v) => {
                return { axisIndex: null, axisValue: v.x || v };
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