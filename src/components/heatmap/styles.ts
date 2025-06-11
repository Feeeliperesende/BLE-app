import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridList: {
    flex: 0,
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  cellText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  legend: {
    marginTop: 8,
    fontSize: 12,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});
