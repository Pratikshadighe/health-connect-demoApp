import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  ScrollView,
  useColorScheme,
  Button,
  Platform,
} from 'react-native';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import {
  initialize as initializeHealthConnect,
  requestPermission as requestPermissionHealthConnect,
  readRecords,
} from 'react-native-health-connect'; // Android-specific Health Connect
import AppleHealthKit from 'react-native-health'; // iOS-specific HealthKit

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const [healthData, setHealthData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [totalCounts, setTotalCounts] = useState({
    steps: 0,
    heartRate: 0,
    activeCalories: 0,
    totalCalories: 0,
  });

  useEffect(() => {
    requestPermissions();
    readHealthData();
  }, []);

  // Function to get the date in ISO format for today
  const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight
    return today.toISOString();
  };

   // Request permissions for reading and writing data
   const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const isInitialized = await initializeHealthConnect();
        if (!isInitialized) {
          throw new Error('Failed to initialize Health Connect');
        }

        const grantedPermissions = await requestPermissionHealthConnect([
          {accessType: 'read', recordType: 'HeartRate'},
          {accessType: 'write', recordType: 'HeartRate'},
          {accessType: 'read', recordType: 'Steps'},
          {accessType: 'write', recordType: 'Steps'},
          {accessType: 'read', recordType: 'ActiveCaloriesBurned'},
          {accessType: 'write', recordType: 'ActiveCaloriesBurned'},
          {accessType: 'read', recordType: 'TotalCaloriesBurned'},
          {accessType: 'write', recordType: 'TotalCaloriesBurned'},
          {accessType: 'read', recordType: 'SleepSession'},
          {accessType: 'write', recordType: 'SleepSession'},
        ]);

        if (!grantedPermissions) {
          throw new Error('Permissions not granted');
        }
      } catch (error) {
        console.error('Error requesting Health Connect permissions:', error);
        setErrorMessage(error.message);
      }
    } else if (Platform.OS === 'ios') {
      const permissions = {
        permissions: {
          read: [
            'HeartRate',
            'StepCount',
            'ActiveEnergyBurned',
            'BasalEnergyBurned',
            // 'SleepAnalysis',
          ],
          write: ['HeartRate', 'StepCount'],
        },
      };

      AppleHealthKit.initHealthKit(permissions, error => {
        if (error) {
          console.error('Error initializing HealthKit:', error);
          setErrorMessage(error.message);
        }
      });
    }
  };

  // Function to read the data
  const readHealthData = async () => {
    if (Platform.OS === 'android') {
      try {
        const today = getTodayDate();

        const heartRateRecords = await readRecords('HeartRate', {
          timeRangeFilter: {
            operator: 'between',
            startTime: today,
            endTime: new Date().toISOString(),
          },
        });

        const stepsRecords = await readRecords('Steps', {
          timeRangeFilter: {
            operator: 'between',
            startTime: today,
            endTime: new Date().toISOString(),
          },
        });

        const activeCaloriesRecords = await readRecords('ActiveCaloriesBurned', {
          timeRangeFilter: {
            operator: 'between',
            startTime: today,
            endTime: new Date().toISOString(),
          },
        });

        const totalCaloriesRecords = await readRecords('TotalCaloriesBurned', {
          timeRangeFilter: {
            operator: 'between',
            startTime: today,
            endTime: new Date().toISOString(),
          },
        });

        // Sum up the total counts for each record type
        const totalSteps = stepsRecords.records.reduce((sum, record) => sum + record.count, 0);
        const totalHeartRate = heartRateRecords.records.reduce((sum, record) => sum + record.samples[0].beatsPerMinute, 0);
        const totalActiveCalories = activeCaloriesRecords.records.reduce((sum, record) => sum + record.energy.inKilocalories, 0);
        const totalTotalCalories = totalCaloriesRecords.records.reduce((sum, record) => sum + record.energy.inKilocalories, 0);

        setTotalCounts({
          steps: totalSteps,
          heartRate: totalHeartRate,
          activeCalories: totalActiveCalories,
          totalCalories: totalTotalCalories,
        });

        const combinedData = {
          heartRate: heartRateRecords.records,
          steps: stepsRecords.records,
          activeCalories: activeCaloriesRecords.records,
          totalCalories: totalCaloriesRecords.records,
        };

        setHealthData(combinedData);
      } catch (error) {
        console.error('Error reading Health Connect data:', error);
        setErrorMessage(error.message);
      }
    } else if (Platform.OS === 'ios') {
      try {
        // Initialize totals
        let heartRateTotal = 0;
        let stepsTotal = 0;
        let activeCaloriesTotal = 0;
        let totalCaloriesTotal = 0;
  
        // Read heart rate data
        AppleHealthKit.getHeartRateSamples(
          {
            startDate: startOfDay,
            endDate: endOfDay,
          },
          (err, heartRateResults) => {
            if (err) {
              console.error('Error reading heart rate data:', err);
              setErrorMessage(err.message);
              return;
            }
  
            // Calculate total heart rate (e.g., average BPM for the day)
            if (heartRateResults.length > 0) {
              heartRateTotal = heartRateResults.reduce((acc, record) => acc + record.value, 0) / heartRateResults.length;
            }
  
            // Update health data
            setHealthData(prevState => ({
              ...prevState,
              heartRate: heartRateResults,
              heartRateTotal,
            }));
          },
        );
  
        // Read step count data
        AppleHealthKit.getStepCount(
          {
            startDate: startOfDay,
            endDate: endOfDay,
          },
          (err, stepsResults) => {
            if (err) {
              console.error('Error reading step count:', err);
              setErrorMessage(err.message);
              return;
            }
  
            // Calculate total steps
            stepsTotal = stepsResults.reduce((acc, record) => acc + record.value, 0);
  
            // Update health data
            setHealthData(prevState => ({
              ...prevState,
              steps: stepsResults,
              stepsTotal,
            }));
          },
        );
  
        // Read active calories burned
        AppleHealthKit.getActiveEnergyBurned(
          {
            startDate: startOfDay,
            endDate: endOfDay,
          },
          (err, activeCaloriesResults) => {
            if (err) {
              console.error('Error reading active calories burned:', err);
              setErrorMessage(err.message);
              return;
            }
  
            // Calculate total active calories
            activeCaloriesTotal = activeCaloriesResults.reduce((acc, record) => acc + record.value, 0);
  
            // Update health data
            setHealthData(prevState => ({
              ...prevState,
              activeCalories: activeCaloriesResults,
              activeCaloriesTotal,
            }));
          },
        );
  
        // Read total calories burned
        AppleHealthKit.getCaloriesBurned(
          {
            startDate: startOfDay,
            endDate: endOfDay,
          },
          (err, totalCaloriesResults) => {
            if (err) {
              console.error('Error reading total calories burned:', err);
              setErrorMessage(err.message);
              return;
            }
  
            // Calculate total calories burned
            totalCaloriesTotal = totalCaloriesResults.reduce((acc, record) => acc + record.value, 0);
  
            // Update health data
            setHealthData(prevState => ({
              ...prevState,
              totalCalories: totalCaloriesResults,
              totalCaloriesTotal,
            }));
          },
        );
      } catch (error) {
        console.error('Error reading HealthKit data:', error);
        setErrorMessage(error.message);
      }
    

    }
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <Text style={styles.title}>Health Connect Data (Today)</Text>

      {/* Display total counts for today */}
      <Text style={styles.totalCountsText}>Total Steps: {totalCounts.steps}</Text>
      <Text style={styles.totalCountsText}>Total Heart Rate: {totalCounts.heartRate}</Text>
      <Text style={styles.totalCountsText}>Total Active Calories Burned: {totalCounts.activeCalories}</Text>
      <Text style={styles.totalCountsText}>Total Calories Burned: {totalCounts.totalCalories}</Text>

      <Button title="Write Heart Rate Data"/>
      {/* Display error message if exists */}
      {errorMessage ? (
        <Text style={styles.errorText}>Error: {errorMessage}</Text>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Display health data if available */}
        {healthData ? (
          <>
            {/* Existing data display logic */}
          </>
        ) : (
          <Text style={styles.noDataText}>No health data available for today</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
  },
  totalCountsText: {
    fontSize: 18,
    marginVertical: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  recordText: {
    fontSize: 15,
    marginVertical: 10,
    textAlign: 'left',
    paddingHorizontal: 20,
  },
  noDataText: {
    fontSize: 18,
    marginVertical: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    marginVertical: 10,
    textAlign: 'center',
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
});

export default App;
