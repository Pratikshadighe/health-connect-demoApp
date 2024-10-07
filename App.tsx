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
  insertRecords,
} from 'react-native-health-connect'; // Android-specific Health Connect
import AppleHealthKit from 'react-native-health'; // iOS-specific HealthKit

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const [healthData, setHealthData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    requestPermissions();
    readHealthData();
  }, []);

  // Function to get the current week's start and end date in ISO format
  const getCurrentWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // Get the current day of the week (0 - Sunday, 6 - Saturday)

    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek); // Set to the beginning of the week (Sunday)
    start.setHours(0, 0, 0, 0); // Set to midnight

    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Set to the end of the week (Saturday)
    end.setHours(23, 59, 59, 999); // Set to the end of the day

    return {start: start.toISOString(), end: end.toISOString()};
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
        const {start, end} = getCurrentWeekRange();

        const heartRateRecords = await readRecords('HeartRate', {
          timeRangeFilter: {
            operator: 'between',
            startTime: start,
            endTime: end,
          },
        });

        const stepsRecords = await readRecords('Steps', {
          timeRangeFilter: {
            operator: 'between',
            startTime: start,
            endTime: end,
          },
        });

        const activeCaloriesRecords = await readRecords(
          'ActiveCaloriesBurned',
          {
            timeRangeFilter: {
              operator: 'between',
              startTime: start,
              endTime: end,
            },
          },
        );

        const totalCaloriesRecords = await readRecords('TotalCaloriesBurned', {
          timeRangeFilter: {
            operator: 'between',
            startTime: start,
            endTime: end,
          },
        });

        const sleepRecords = await readRecords('SleepSession', {
          timeRangeFilter: {
            operator: 'between',
            startTime: start,
            endTime: end,
          },
        });

        const combinedData = {
          heartRate: heartRateRecords.records,
          steps: stepsRecords.records,
          activeCalories: activeCaloriesRecords.records,
          totalCalories: totalCaloriesRecords.records,
          sleep: sleepRecords.records,
        };

        setHealthData(combinedData);
      } catch (error) {
        console.error('Error reading Health Connect data:', error);
        setErrorMessage(error.message);
      }
    } else if (Platform.OS === 'ios') {
      AppleHealthKit.getHeartRateSamples(
        {
          startDate: new Date(2024, 9, 1).toISOString(),
          endDate: new Date().toISOString(),
        },
        (err, results) => {
          if (err) {
            console.error('Error reading heart rate data:', err);
            setErrorMessage(err.message);
            return;
          }
          setHealthData(prevState => ({
            ...prevState,
            heartRate: results,
          }));
        },
      );

      // Retrieve step count
      AppleHealthKit.getStepCount(
        {
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
        },
        (err, stepsResults) => {
          if (err) {
            console.error('Error reading step count:', err);
            setErrorMessage(err.message);
            return;
          }
          // Ensure stepsResults is an array
          const stepsArray = Array.isArray(stepsResults)
            ? stepsResults
            : [stepsResults];
          setHealthData(prevState => ({
            ...prevState,
            steps: stepsArray,
          }));
        },
      );

      AppleHealthKit.getActiveEnergyBurned(
        {
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
        },
        (err, results) => {
          if (err) {
            console.error('Error reading active calories burned:', err);
            setErrorMessage(err.message);
            return;
          }
          setHealthData(prevState => ({
            ...prevState,
            activeCalories: results,
          }));
        },
      );

      AppleHealthKit.getSleepSamples(
        {
          startDate: new Date(2024, 0, 0).toISOString(),
          endDate: new Date().toISOString(),
          limit: 10,
          ascending: true,
        },
        (err, results) => {
          if (err) {
            console.error('Error reading sleep data:', err);
            setErrorMessage(err.message);
            return;
          }
          setHealthData(prevState => ({
            ...prevState,
            sleep: results,
          }));
        },
      );
    }
  };

  // Example function to write heart rate data
  // Example function to write heart rate data
  // Example function to write heart rate data
  const writeHeartRateData = async () => {
    if (Platform.OS === 'android') {
      // Android Health Connect logic here
    } else if (Platform.OS === 'ios') {
      const sample = {
        value: 75, // Beats per minute
        startDate: new Date(2024, 9, 1).toISOString(), // Ensure the date is set correctly
        endDate: new Date(2024, 9, 1).toISOString(), // Same date for a single entry
      };

      AppleHealthKit.saveHeartRateSample(sample, err => {
        if (err) {
          console.error('Error writing heart rate data:', err);
          setErrorMessage(err.message);
          return;
        }
        readHealthData();
        console.log('Heart rate data written successfully');
      });
    }
  };

  // Function to format date to dd-mm-yyyy
  const formatDate = (isoDate: string | number | Date) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-GB'); // This will give you dd/mm/yyyy format
  };
  console.log('health data', healthData);

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <Text style={styles.title}>Health Connect Data (This Week)</Text>

      <Button title="Write Heart Rate Data" onPress={writeHeartRateData} />
      {/* Display error message if exists */}
      {errorMessage ? (
        <Text style={styles.errorText}>Error: {errorMessage}</Text>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Display health data if available */}
        {healthData ? (
          <>
            {/* Sleep Records */}
            <Text style={[styles.recordText, {fontWeight: 'bold'}]}>
              Sleep Records:
            </Text>
            {healthData?.sleep?.map((record, index) => (
              <Text key={index} style={styles.recordText}>
                {`Start: ${formatDate(record.startTime)}, End: ${formatDate(
                  record.endTime,
                )}, Duration: ${
                  (new Date(record.endTime) - new Date(record.startTime)) /
                  1000 /
                  60
                } minutes`}
              </Text>
            ))}

            {/* Heart Rate Records */}
            <Text style={[styles.recordText, {fontWeight: 'bold'}]}>
              Heart Rate Records:
            </Text>
            {healthData?.heartRate?.map((record, index) => (
              <Text key={index} style={styles.recordText}>
                {Platform.OS === 'android'
                  ? `Date: ${formatDate(record.startTime)}, BPM: ${
                      record.samples[0].beatsPerMinute
                    }`
                  : `Date: ${formatDate(record.startDate)}, BPM: ${
                      record.value
                    }` // Modify according to your iOS data structure
                }
              </Text>
            ))}

            {/* Steps Records */}
            <Text style={[styles.recordText, {fontWeight: 'bold'}]}>
              Steps Records:
            </Text>
            {healthData?.steps?.length > 0 ? (
              healthData.steps.map((record, index) => (
                <Text key={index} style={styles.recordText}>
                  {Platform.OS === 'android'
                    ? `Date: ${formatDate(record.startTime)}, Steps: ${
                        record.count
                      }`
                    : `Date: ${formatDate(record.startDate)}, Steps: ${
                        record.value
                      }` // Modify according to your iOS data structure
                  }
                </Text>
              ))
            ) : (
              <Text style={styles.noDataText}>No step data available</Text>
            )}

            {/* Active Calories Burned */}
            <Text style={[styles.recordText, {fontWeight: 'bold'}]}>
              Active Calories Burned:
            </Text>
            {healthData?.activeCalories?.map((record, index) => (
              <Text key={index} style={styles.recordText}>
                {Platform.OS === 'android'
                  ? `Date: ${formatDate(record.startTime)}, Calories Burned: ${
                      record.energy.inKilocalories
                    }`
                  : `Date: ${formatDate(record.startDate)}, Calories Burned: ${
                      record.value
                    }` // Modify according to your iOS data structure
                }
              </Text>
            ))}

            {/* Total Calories Burned */}
            <Text style={[styles.recordText, {fontWeight: 'bold'}]}>
              Total Calories Burned:
            </Text>
            {healthData?.totalCalories?.map((record, index) => (
              <Text key={index} style={styles.recordText}>
                {Platform.OS === 'android'
                  ? `Date: ${formatDate(
                      record.startTime,
                    )}, Total Calories Burned: ${record.energy.inKilocalories}`
                  : `Date: ${formatDate(
                      record.startDate,
                    )}, Total Calories Burned: ${
                      record.value
                    }` // Modify according to your iOS data structure
                }
              </Text>
            ))}
          </>
        ) : (
          <Text style={styles.noDataText}>
            No health data available for this week
          </Text>
        )}
      </ScrollView>

      {/* Button to write sample heart rate data */}
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
