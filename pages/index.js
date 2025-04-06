import { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Grid } from '@mui/material';
import DecisionTree from '../components/DecisionTree';
import DataVisualizer from '../components/DataVisualizer';
import Predictor from '../components/Predictor';
import Papa from 'papaparse';

export default function Home() {
  const [data, setData] = useState([]);
  const [userInput, setUserInput] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [trainedTree, setTrainedTree] = useState(null);
  const [minSamples, setMinSamples] = useState(2);

  useEffect(() => {
    // 加载数据
    Papa.parse('/data.csv', {
      download: true,
      header: true,
      transform: (value, field) => {
        if (field === 'hours_studied_per_week' || field === 'attendance_rate_percent') {
          return Number(value);
        }
        if (field === 'passed_exam') {
          // 修复passed_exam的转换逻辑
          return value === '1' || value.toLowerCase() === 'true' || value === true;
        }
        return value;
      },
      complete: (results) => {
        // 过滤掉无效数据
        const validData = results.data.filter(row => 
          !isNaN(row.hours_studied_per_week) && 
          !isNaN(row.attendance_rate_percent) &&
          typeof row.passed_exam === 'boolean'
        );
        console.log('数据样本:', validData.slice(0, 5)); // 打印前5个样本用于调试
        setData(validData);
      }
    });
  }, []);

  // 处理预测结果变化
  const handlePredictionChange = (input, pred) => {
    setUserInput(input);
    setPrediction(pred);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
        决策树学习演示
      </Typography>
      
      <Grid container spacing={3}>
        {/* 左侧：决策树分裂过程 */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" gutterBottom>
              决策树分裂过程
            </Typography>
            <DecisionTree 
              data={data} 
              onTreeUpdate={(tree, samples) => {
                setTrainedTree(tree);
                setMinSamples(samples);
              }}
            />
          </Paper>
        </Grid>

        {/* 右侧：数据可视化和预测工具 */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                数据可视化
              </Typography>
              <DataVisualizer 
                data={data} 
                userInput={userInput}
                prediction={prediction}
              />
            </Paper>

            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                预测工具
              </Typography>
              <Predictor 
                data={data} 
                minSamples={minSamples}
                trainedTree={trainedTree}
                onPredictionChange={handlePredictionChange}
              />
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
} 