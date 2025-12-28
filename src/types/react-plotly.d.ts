declare module 'react-plotly.js' {
  import { Component } from 'react';
  import { Layout, Data, Config, PlotlyHTMLElement } from 'plotly.js';

  export interface PlotParams {
    data: Data[];
    layout?: Partial<Layout>;
    config?: Partial<Config>;
    frames?: Plotly.Frame[];
    revision?: number;
    onInitialized?: (figure: Readonly<{ data: Data[]; layout: Partial<Layout> }>, graphDiv: Readonly<PlotlyHTMLElement>) => void;
    onUpdate?: (figure: Readonly<{ data: Data[]; layout: Partial<Layout> }>, graphDiv: Readonly<PlotlyHTMLElement>) => void;
    onPurge?: (figure: Readonly<{ data: Data[]; layout: Partial<Layout> }>, graphDiv: Readonly<PlotlyHTMLElement>) => void;
    onError?: (error: Error) => void;
    useResizeHandler?: boolean;
    style?: React.CSSProperties;
    className?: string;
    debug?: boolean;
    divId?: string;
  }

  export default class Plot extends Component<PlotParams> {}
}
