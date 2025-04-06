import { useState, useEffect } from 'react';
import { Box, TextField } from '@mui/material';

export default function Predictor({ data, minSamples, onPredictionChange, trainedTree }) {
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('');
  const [prediction, setPrediction] = useState(null);

  // 当输入改变时进行预测
  useEffect(() => {
    if (hours === '' || rate === '' || !data || data.length === 0 || !trainedTree) {
      setPrediction(null);
      onPredictionChange && onPredictionChange(null, null);
      return;
    }

    const hoursNum = Number(hours);
    const rateNum = Number(rate);

    if (isNaN(hoursNum) || isNaN(rateNum)) {
      setPrediction(null);
      onPredictionChange && onPredictionChange(null, null);
      return;
    }

    try {
      // 准备训练数据（仅用于计算分布）
      const X = data.map(d => [d.hours_studied_per_week, d.attendance_rate_percent]);
      const y = data.map(d => d.passed_exam ? 1 : 0);

      // 使用已训练好的树进行预测
      const predictWithAdjustedTree = (node, sample) => {
        if (!node) return null;

        // 计算节点的样本分布
        const calculateDistribution = (node, X, y) => {
          if (!node) return [0, 0];

          let indices = Array.from({length: X.length}, (_, i) => i);
          let currentNode = node;
          let path = [];
          
          while (currentNode.parent) {
            path.unshift({
              node: currentNode,
              parent: currentNode.parent
            });
            currentNode = currentNode.parent;
          }

          indices = indices.filter(i => {
            return path.every(({node, parent}) => {
              const value = X[i][parent.splitColumn];
              const isLeft = node === parent.left;
              return isLeft ? value <= parent.splitValue : value > parent.splitValue;
            });
          });

          const samples = indices.map(i => y[i]);
          return [
            samples.filter(v => v === 0).length,
            samples.filter(v => v === 1).length
          ];
        };

        // 获取当前节点的分布
        const distribution = calculateDistribution(node, X, y);
        const totalSamples = distribution[0] + distribution[1];

        // 如果是叶子节点，返回预测结果
        if (!node.left && !node.right) {
          const passRate = totalSamples > 0 ? (distribution[1] / totalSamples) * 100 : 0;
          const prediction = passRate > 50;  // 通过率大于50%预测为通过
          const confidence = passRate;  // 直接使用通过率作为置信度
          return { prediction, confidence };
        }

        // 检查子节点的样本数
        let leftDist = node.left ? calculateDistribution(node.left, X, y) : [0, 0];
        let rightDist = node.right ? calculateDistribution(node.right, X, y) : [0, 0];
        const leftSamples = leftDist[0] + leftDist[1];
        const rightSamples = rightDist[0] + rightDist[1];

        // 应用回溯规则1：处理样本数不足的子节点
        if (leftSamples < Number(minSamples) && rightSamples >= Number(minSamples)) {
          // 将左子节点的样本合并到右子节点
          return predictWithAdjustedTree(node.right, sample);
        } else if (rightSamples < Number(minSamples) && leftSamples >= Number(minSamples)) {
          // 将右子节点的样本合并到左子节点
          return predictWithAdjustedTree(node.left, sample);
        } else if (leftSamples < Number(minSamples) && rightSamples < Number(minSamples)) {
          // 如果两个子节点的样本数都不足，将当前节点作为叶子节点
          const passRate = totalSamples > 0 ? (distribution[1] / totalSamples) * 100 : 0;
          const prediction = passRate > 50;  // 通过率大于50%预测为通过
          const confidence = passRate;  // 直接使用通过率作为置信度
          return { prediction, confidence };
        }

        // 正常的分裂预测
        const value = sample[node.splitColumn];
        if (value <= node.splitValue) {
          return predictWithAdjustedTree(node.left, sample);
        } else {
          return predictWithAdjustedTree(node.right, sample);
        }
      };

      // 进行预测
      const result = predictWithAdjustedTree(trainedTree.root, [hoursNum, rateNum]);
      
      if (result) {
        setPrediction({
          passed: result.prediction,
          confidence: result.confidence.toFixed(1)
        });
        // 通知父组件预测结果和用户输入，用于更新散点图
        onPredictionChange && onPredictionChange(
          { hours: hoursNum, rate: rateNum },
          result.prediction
        );
      }

    } catch (error) {
      console.error('预测错误:', error);
      alert('预测过程中发生错误！');
    }
  }, [hours, rate, data, minSamples, trainedTree]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2,
      p: 2,
      bgcolor: 'background.paper',
      borderRadius: 1,
      boxShadow: 1
    }}>
      <TextField
        label="每周学习时间（小时）"
        type="number"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        inputProps={{ min: 0, max: 100, step: 0.5 }}
        fullWidth
      />
      <TextField
        label="出勤率（%）"
        type="number"
        value={rate}
        onChange={(e) => setRate(e.target.value)}
        inputProps={{ min: 0, max: 100, step: 1 }}
        fullWidth
      />
      {prediction !== null && (
        <Box sx={{ 
          mt: 1, 
          p: 1, 
          bgcolor: prediction.passed ? '#e8f5e9' : '#ffebee',
          borderRadius: 1,
          textAlign: 'center',
          color: prediction.passed ? '#2e7d32' : '#c62828'
        }}>
          预测结果：{prediction.passed ? '通过' : '不通过'}（置信度：{prediction.confidence}%）
        </Box>
      )}
    </Box>
  );
} 