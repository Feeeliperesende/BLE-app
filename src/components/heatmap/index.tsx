import React from 'react';
import {View, Text, Dimensions} from 'react-native';
import {FlatGrid} from 'react-native-super-grid';
import {HeatmapDataPoint} from '../../types/ble';
import {styles} from './styles';

interface HeatmapChartProps {
  data: HeatmapDataPoint[];
  width?: number;
  height?: number;
  title?: string;
}

const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  width = Dimensions.get('window').width - 40,
  height = 300,
  title = 'Heatmap Chart',
}) => {
  const getColorForValue = (value: number): string => {
    const normalized = Math.max(0, Math.min(1, value / 100));

    if (normalized < 0.25) {
      const ratio = normalized / 0.25;
      return `rgb(${Math.round(0 * ratio)}, ${Math.round(
        100 + 155 * ratio,
      )}, 255)`;
    } else if (normalized < 0.5) {
      const ratio = (normalized - 0.25) / 0.25;
      return `rgb(${Math.round(255 * ratio)}, 255, ${Math.round(
        255 * (1 - ratio),
      )})`;
    } else if (normalized < 0.75) {
      const ratio = (normalized - 0.5) / 0.25;
      return `rgb(255, ${Math.round(255 * (1 - ratio))}, 0)`;
    } else {
      return 'rgb(255, 0, 0)';
    }
  };

  const maxX = Math.max(...data.map(d => d.x));
  const maxY = Math.max(...data.map(d => d.y));
  const cellSize = Math.min(width / (maxX + 1), height / (maxY + 1)) - 2;

  const renderCell = ({item}: {item: HeatmapDataPoint}) => (
    <View
      style={[
        styles.cell,
        {
          backgroundColor: getColorForValue(item.value),
          width: cellSize,
          height: cellSize,
        },
      ]}>
      <Text style={styles.cellText}>{item.value.toFixed(0)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartContainer}>
        <FlatGrid
          itemDimension={cellSize}
          data={data}
          style={styles.gridList}
          spacing={2}
          renderItem={renderCell}
          staticDimension={width}
          maxItemsPerRow={maxX + 1}
        />
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>
          Legenda: Azul (Baixo) → Vermelho (Alto)
        </Text>
      </View>
    </View>
  );
};

export default HeatmapChart;
