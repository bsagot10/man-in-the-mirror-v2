// filepath: src/lib/PlotlyPartial.tsx
// Purpose: Creates a Plot component using the partial plotly.js-basic-dist bundle (~1MB vs ~3.5MB full)
// Key exports: default (Plot component)

'use client';

import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-basic-dist';

const Plot = createPlotlyComponent(Plotly);

export default Plot;
