import React from 'react';
import {View, Text} from 'react-native';
import Svg, {Rect, Text as SvgText} from 'react-native-svg';
import {styles} from './styles';

interface BLEDevice {
  id: string;
  name?: string;
  rssi?: number;
}

interface HeatmapChartProps {
  data: BLEDevice[];
  title?: string;
  cellSize?: number;
  cellSpacing?: number;
  maxCols?: number;
}

const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  title = 'Heatmap Chart',
  cellSize = 40,
  cellSpacing = 6,
  maxCols = 6,
}) => {
  const numCols = Math.min(maxCols, data.length);
  const numRows = Math.ceil(data.length / numCols);
  const svgWidth = numCols * (cellSize + cellSpacing);
  const svgHeight = numRows * (cellSize + cellSpacing);

  const getColorFromRSSI = (rssi: number): string => {
    const normalized = Math.max(0, Math.min(1, (rssi + 100) / 70));
    const red = Math.floor(255 * (1 - normalized));
    const green = Math.floor(255 * normalized);
    return `rgb(${red},${green},0)`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <Svg width={svgWidth} height={svgHeight}>
        {data.map((item, index) => {
          const col = index % numCols;
          const row = Math.floor(index / numCols);
          const x = col * (cellSize + cellSpacing);
          const y = row * (cellSize + cellSpacing);
          const fillColor = getColorFromRSSI(item.rssi ?? 0);

          return (
            <React.Fragment key={item.id}>
              <Rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill={fillColor}
                rx={6}
                ry={6}
              />
              <SvgText
                x={x + cellSize / 2}
                y={y + cellSize / 2}
                fill="white"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle">
                {item.rssi}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      <Text style={styles.legend}>
        Legend: Red (weak signal) → Green (strong signal)
      </Text>
    </View>
  );
};

export default HeatmapChart;
