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
  aggregateRecord
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

    // Convert seconds to hours and minutes
    const convertMinutesToHours = (totalSeconds) => {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    };

  // Function to get the date in ISO format for today
  const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight
    return today.toISOString();
  };

  const getOctoberFirstDate = () => {
    const date = new Date();
    date.setFullYear(2024); // Set the year to 2024
    date.setMonth(9); // October is month 9 (0-based index)
    date.setDate(1); // Set to 1st of the month
    date.setHours(0, 0, 0, 0); // Set to midnight
    return date.toISOString();
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

  console.log("healthData",healthData)

  const readHealthData = async () => {
    if (Platform.OS === 'android') {
      try {
        const today = getTodayDate();

        const stepsData = await aggregateRecord({
          recordType: 'Steps',
          timeRangeFilter: {
            operator: 'between',
            startTime: today,
            endTime: new Date().toISOString(),
          },
        }).then((result) => {
              return result  // Aggregated record:  {"result": {"dataOrigins": ["com.healthconnectexample"], "inCalories": 15000000, "inJoules": 62760000.00989097, "inKilocalories": 15000, "inKilojoules": 62760.00000989097}}
        });

        const sleepData = await aggregateRecord({
          recordType: 'SleepSession',
          timeRangeFilter: {
            operator: 'between',
            startTime: today,
            endTime: new Date().toISOString(),
          },
        }).then((result) => {
          console.log("sleep",result)
              return result  // Aggregated record:  {"result": {"dataOrigins": ["com.healthconnectexample"], "inCalories": 15000000, "inJoules": 62760000.00989097, "inKilocalories": 15000, "inKilojoules": 62760.00000989097}}
        });

        const heartRateRecords = await aggregateRecord({
          recordType: 'HeartRate',
          timeRangeFilter: {
            operator: 'between',
            startTime: today,
            endTime: new Date().toISOString(),
          },
        }).then((result) => {
          return result  // Aggregated record:  {"result": {"dataOrigins": ["com.healthconnectexample"], "inCalories": 15000000, "inJoules": 62760000.00989097, "inKilocalories": 15000, "inKilojoules": 62760.00000989097}}
    });

        const totalCaloriesRecords = await aggregateRecord({
          recordType: 'TotalCaloriesBurned',
          timeRangeFilter: {
            operator: 'between',
            startTime: today,
            endTime: new Date().toISOString(),
          },
        }).then((result) => {
          return result  // Aggregated record:  {"result": {"dataOrigins": ["com.healthconnectexample"], "inCalories": 15000000, "inJoules": 62760000.00989097, "inKilocalories": 15000, "inKilojoules": 62760.00000989097}}
    });

        const activeCaloriesRecords = await aggregateRecord({
          recordType: 'ActiveCaloriesBurned',
          timeRangeFilter: {
            operator: 'between',
            startTime: today,
            endTime: new Date().toISOString(),
          },
        }).then((result) => {
          return result  // Aggregated record:  {"result": {"dataOrigins": ["com.healthconnectexample"], "inCalories": 15000000, "inJoules": 62760000.00989097, "inKilocalories": 15000, "inKilojoules": 62760.00000989097}}
    });
     
    const combinedData = {
      heartRate: heartRateRecords,
      steps: stepsData,
      activeCalories: activeCaloriesRecords,
      totalCalories: totalCaloriesRecords,
      sleep:sleepData
    };
    setHealthData(combinedData);
      
      } catch (error) {
        console.error('Error reading Health Connect data:', error);
        setErrorMessage(error.message);
      }
    }else if (Platform.OS === 'ios') {
      // iOS-specific HealthKit reading logic here
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const endOfDay = new Date();

      AppleHealthKit.getHeartRateSamples(
        {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
          limit: 1,
          ascending: false,
        },
        (err: any, results: any) => {
          if (err) {
            console.error('Error fetching heart rate data:', err);
            return;
          }
          if (results.length > 0) {
            const latestHeartRate = [];
            latestHeartRate.push(results[0]);
            setHealthData((prevState: any) => ({
              ...prevState,
              heartRate: latestHeartRate[0].value,
            }));
          }
        }
      );

      AppleHealthKit.getStepCount(
        { date: new Date().toISOString() },
        (err: any, stepsResults: any) => {
          if (err) {
            console.error('Error reading step count:', err);
            setErrorMessage(err.message);
            return;
          }
          setHealthData((prevState: any) => ({
            ...prevState,
            steps: stepsResults,
          }));
        }
      );

      AppleHealthKit.getActiveEnergyBurned(
        {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
        },
        (err: any, results: any) => {
          if (err) {
            console.error('Error reading active calories burned:', err);
            setErrorMessage(err.message);
            return;
          }
          if (results && results.length > 0) {
            const totalActiveCalories = results.reduce((total: number, entry: any) => {
              return total + (entry.value || 0);
            }, 0);
            setHealthData((prevState: any) => ({
              ...prevState,
              activeCalories: totalActiveCalories,
            }));
          }
        }
      );

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      AppleHealthKit.getSleepSamples(
        {
          startDate: oneWeekAgo.toISOString(),
          endDate: now.toISOString(),
          limit: 10,
          ascending: false,
        },
        (err: any, results: any) => {
          if (err) {
            console.error('Error reading sleep data:', err);
            setErrorMessage(err.message);
            return;
          }

          const sleepData = results.map((sample: any) => {
            const startDate = new Date(sample.startDate);
            const endDate = new Date(sample.endDate);
            const durationInMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
            const hours = Math.floor(durationInMinutes / 60);
            const minutes = Math.floor(durationInMinutes % 60);

            return {
              startDate: startDate.toLocaleString(),
              endDate: endDate.toLocaleString(),
              value: sample.value,
              duration: `${hours}h ${minutes}m`,
            };
          });

          setHealthData((prevState: any) => ({
            ...prevState,
            sleep: sleepData[0],
          }));
        }
      );
    }
  };

  return (
<SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <Text style={styles.title}>Health Connect Data (Today)</Text>

      {Platform.OS === 'android' ? (
        <>
          <Text style={styles.totalCountsText}>
            Total Steps: {healthData?.steps?.COUNT_TOTAL ?? 0}
          </Text>
          <Text style={styles.totalCountsText}>
            Total Heart Rate: {healthData?.heartRate?.BPM_AVG ?? 0}
          </Text>
          <Text style={styles.totalCountsText}>
            Total Active Calories Burned: {healthData?.activeCalories.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0}
          </Text>
          <Text style={styles.totalCountsText}>
            Total Calories Burned: {healthData?.totalCalories?.ENERGY_TOTAL.inKilocalories ?? 0}
          </Text>
          <Text style={styles.totalCountsText}>
          Sleep: {healthData?.sleep?.SLEEP_DURATION_TOTAL ? convertMinutesToHours(healthData.sleep.SLEEP_DURATION_TOTAL) : '0h 0m'}
          </Text>
        </>
      ) : (
        <><Text style={styles.totalCountsText}>
            Total Steps: {healthData?.steps?.value ?? 0}
          </Text><Text style={styles.totalCountsText}>
              Total Heart Rate: {healthData?.heartRate ?? 0}
            </Text><Text style={styles.totalCountsText}>
            Active Calorie Burned: {healthData?.activeCalories ?? 0}
          </Text>
          <Text style={styles.totalCountsText}>
          Sleep: {healthData.sleep?.duration  ?? '0h 0m'}
          </Text>
          </>
    
      )}

      {/* <Button title="Write Heart Rate Data" onPress={() => {}} /> */}
      <ScrollView>
        {/* <Text style={styles.dataContainer}>
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : (
            JSON.stringify(healthData, null, 2)
          )}
        </Text> */}
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
