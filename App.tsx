import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Subscription } from 'expo-sensors/build/DeviceSensor';

// Тип для данных акселерометра
type Acceleration = {
  x: number;
  y: number;
  z: number;
};

// Тип для записи истории
type HistoryRecord = {
  id: string;
  date: string;
  steps: number;
  distance: number;
  duration: string;
};

export default function PedometerApp() {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  
  // Последнее показание акселерометра и время последнего шага.
  // Хранятся в ref, а не в state: так подписка на датчик не пересоздаётся
  // при каждом новом показании (раньше это происходило каждые 100 мс).
  const lastAcceleration = useRef<Acceleration | null>(null);
  const lastStepTime = useRef(0);

  // Средняя длина шага в метрах
  const stepLength = 0.7;
  // Порог суммарного изменения ускорения (в g), выше которого считаем шаг
  const stepThreshold = 1.2;
  // Минимальный интервал между шагами (мс) — защита от двойного счёта одного шага
  const minStepIntervalMs = 300;

  // Загружаем историю при монтировании
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem('pedometerHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    }
  };

  const saveHistory = async (newRecord: HistoryRecord) => {
    try {
      const updatedHistory = [newRecord, ...history];
      await AsyncStorage.setItem('pedometerHistory', JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
    } catch (error) {
      console.error('Ошибка сохранения истории:', error);
    }
  };

  useEffect(() => {
    let subscription: Subscription | null = null;

    if (isMeasuring) {
      lastAcceleration.current = null;
      Accelerometer.setUpdateInterval(100);

      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const prev = lastAcceleration.current;

        if (prev) {
          const acceleration =
            Math.abs(x - prev.x) + Math.abs(y - prev.y) + Math.abs(z - prev.z);
          const now = Date.now();

          if (acceleration > stepThreshold && now - lastStepTime.current > minStepIntervalMs) {
            lastStepTime.current = now;
            setSteps(s => s + 1);
            setDistance(d => d + stepLength);
          }
        }

        lastAcceleration.current = { x, y, z };
      });
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isMeasuring]);

  const startMeasuring = () => {
    setSteps(0);
    setDistance(0);
    setStartTime(new Date());
    setIsMeasuring(true);
  };

  const stopMeasuring = async () => {
    setIsMeasuring(false);
    
    if (startTime) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationStr = formatDuration(durationMs);
      
      const newRecord: HistoryRecord = {
        id: Date.now().toString(),
        date: endTime.toLocaleString(),
        steps,
        distance: parseFloat(distance.toFixed(2)),
        duration: durationStr,
      };
      
      await saveHistory(newRecord);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    
    return `${hours > 0 ? hours + 'ч ' : ''}${minutes > 0 ? minutes + 'м ' : ''}${seconds}с`;
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem('pedometerHistory');
      setHistory([]);
    } catch (error) {
      console.error('Ошибка очистки истории:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Шагомер</Text>
      
      <View style={styles.dataContainer}>
        <Text style={styles.dataText}>Шаги: {steps}</Text>
        <Text style={styles.dataText}>Дистанция: {distance.toFixed(2)} м</Text>
        <Text style={styles.dataText}>Статус: {isMeasuring ? 'Измерение...' : 'Остановлен'}</Text>
      </View>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.startButton]} 
          onPress={startMeasuring}
          disabled={isMeasuring}
        >
          <Text style={styles.buttonText}>Старт</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.stopButton]} 
          onPress={stopMeasuring}
          disabled={!isMeasuring}
        >
          <Text style={styles.buttonText}>Стоп</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.button, styles.clearButton]} 
        onPress={clearHistory}
        disabled={history.length === 0}
      >
        <Text style={styles.buttonText}>Очистить историю</Text>
      </TouchableOpacity>

      <Text style={styles.historyTitle}>История измерений:</Text>
      
      {history.length > 0 ? (
        <FlatList
          style={styles.historyList}
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.historyItem}>
              <Text style={styles.historyDate}>{item.date}</Text>
              <Text>Шаги: {item.steps}</Text>
              <Text>Дистанция: {item.distance} м</Text>
              <Text>Длительность: {item.duration}</Text>
            </View>
          )}
        />
      ) : (
        <Text style={styles.noHistoryText}>Нет сохраненных измерений</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  dataContainer: {
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  dataText: {
    fontSize: 16,
    marginBottom: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    elevation: 2,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  clearButton: {
    backgroundColor: '#607D8B',
    marginBottom: 20,
    width: '80%',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  historyList: {
    width: '100%',
  },
  historyItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  historyDate: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  noHistoryText: {
    color: '#888',
    fontStyle: 'italic',
  },
});
