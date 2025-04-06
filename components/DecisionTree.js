import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Button, Box, TextField } from '@mui/material';
import { DecisionTreeClassifier as TreeClassifier } from 'ml-cart';

// 计算基尼不纯度
function calculateGiniImpurity(data) {
  if (data.length === 0) return 0;
  const passed = data.filter(d => d.passed_exam).length;
  const failed = data.length - passed;
  const p1 = passed / data.length;
  const p2 = failed / data.length;
  return 1 - (p1 * p1 + p2 * p2);
}

// 寻找最佳分裂点
function findBestSplit(data) {
  let bestGain = 0;
  let bestSplit = null;
  let bestFeature = null;

  const features = ['hours_studied_per_week', 'attendance_rate_percent'];
  const parentGini = calculateGiniImpurity(data);

  features.forEach(feature => {
    // 对特征值进行排序
    const sortedValues = [...new Set(data.map(d => d[feature]))].sort((a, b) => a - b);
    
    // 尝试每个可能的分裂点
    for (let i = 0; i < sortedValues.length - 1; i++) {
      const splitValue = (sortedValues[i] + sortedValues[i + 1]) / 2;
      const leftData = data.filter(d => d[feature] <= splitValue);
      const rightData = data.filter(d => d[feature] > splitValue);
      
      const leftGini = calculateGiniImpurity(leftData);
      const rightGini = calculateGiniImpurity(rightData);
      
      const weightedGini = (leftData.length * leftGini + rightData.length * rightGini) / data.length;
      const gain = parentGini - weightedGini;
      
      if (gain > bestGain) {
        bestGain = gain;
        bestSplit = splitValue;
        bestFeature = feature;
      }
    }
  });

  return { feature: bestFeature, value: bestSplit, gain: bestGain };
}

export default function DecisionTree({ data, onTreeUpdate }) {
  const svgRef = useRef();
  const [treeData, setTreeData] = useState(null);
  const [minSamples, setMinSamples] = useState(2);
  const [forceUpdate, setForceUpdate] = useState(0);  // 添加强制更新标记

  // 构建决策树
  const buildTree = () => {
    if (!data || data.length === 0) {
      setTreeData(null);
      onTreeUpdate && onTreeUpdate(null, minSamples);
      return;
    }

    try {
      // 清空SVG内容
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
      }

      // 准备训练数据
      const X = data.map(d => [d.hours_studied_per_week, d.attendance_rate_percent]);
      const y = data.map(d => d.passed_exam ? 1 : 0);

      // 创建和训练决策树
      const dt = new TreeClassifier({
        maxDepth: 3,
        minNumSamples: Number(minSamples),
        gainFunction: 'gini',
        minImpurityDecrease: 0.01
      });

      dt.train(X, y);

      // 将决策树模型转换为可视化数据
      const convertTreeToVisData = (node) => {
        if (!node) return null;

        // 计算节点的样本分布
        const calculateDistribution = (node, X, y) => {
          if (!node) return [0, 0];

          // 获取当前节点的样本
          let indices = Array.from({length: X.length}, (_, i) => i);
          
          // 从当前节点向上遍历到根节点，收集所有分裂条件
          let currentNode = node;
          let path = [];
          while (currentNode.parent) {
            path.unshift({
              node: currentNode,
              parent: currentNode.parent
            });
            currentNode = currentNode.parent;
          }

          // 应用所有分裂条件
          indices = indices.filter(i => {
            return path.every(({node, parent}) => {
              const value = X[i][parent.splitColumn];
              const isLeft = node === parent.left;
              return isLeft ? value <= parent.splitValue : value > parent.splitValue;
            });
          });

          // 计算分布
          const samples = indices.map(i => y[i]);
          return [
            samples.filter(v => v === 0).length,  // 不通过的数量
            samples.filter(v => v === 1).length   // 通过的数量
          ];
        };

        // 计算当前节点的分布
        const distribution = calculateDistribution(node, X, y);
        const totalSamples = distribution[0] + distribution[1];

        // 特征名称映射
        const featureNames = {
          0: '学习时间(小时)',
          1: '出勤率(%)'
        };

        // 处理子节点
        let leftChild = null;
        let rightChild = null;

        if (node.left) {
          const leftDist = calculateDistribution(node.left, X, y);
          const leftSamples = leftDist[0] + leftDist[1];
          node.left.parent = node;  // 设置父节点引用
          leftChild = convertTreeToVisData(node.left);
        }

        if (node.right) {
          const rightDist = calculateDistribution(node.right, X, y);
          const rightSamples = rightDist[0] + rightDist[1];
          node.right.parent = node;  // 设置父节点引用
          rightChild = convertTreeToVisData(node.right);
        }

        // 回溯检查1：处理样本数小于最小样本数的叶子节点
        if (leftChild && rightChild) {
          // 如果左子节点是叶子节点且样本数不足
          if (!leftChild.children && leftChild.samples < Number(minSamples)) {
            // 将左子节点的样本合并到右子节点
            if (rightChild.children) {
              // 如果右子节点是分裂节点，将其转换为叶子节点
              const rightDist = [distribution[0], distribution[1]];
              const passRate = ((rightDist[1] / (rightDist[0] + rightDist[1])) * 100).toFixed(1);
              rightChild = {
                name: rightDist[1] > rightDist[0] ? '考试通过' : '考试不通过',
                details: `通过率: ${passRate}%`,
                samples: rightDist[0] + rightDist[1],
                prediction: rightDist[1] > rightDist[0]
              };
            } else {
              // 更新右叶子节点的样本数和预测
              const totalDist = [distribution[0], distribution[1]];
              const passRate = ((totalDist[1] / (totalDist[0] + totalDist[1])) * 100).toFixed(1);
              rightChild.samples = totalDist[0] + totalDist[1];
              rightChild.name = totalDist[1] > totalDist[0] ? '考试通过' : '考试不通过';
              rightChild.details = `通过率: ${passRate}%`;
              rightChild.prediction = totalDist[1] > totalDist[0];
            }
            leftChild = null;
          }
          // 如果右子节点是叶子节点且样本数不足
          else if (!rightChild.children && rightChild.samples < Number(minSamples)) {
            // 将右子节点的样本合并到左子节点
            if (leftChild.children) {
              // 如果左子节点是分裂节点，将其转换为叶子节点
              const leftDist = [distribution[0], distribution[1]];
              const passRate = ((leftDist[1] / (leftDist[0] + leftDist[1])) * 100).toFixed(1);
              leftChild = {
                name: leftDist[1] > leftDist[0] ? '考试通过' : '考试不通过',
                details: `通过率: ${passRate}%`,
                samples: leftDist[0] + leftDist[1],
                prediction: leftDist[1] > leftDist[0]
              };
            } else {
              // 更新左叶子节点的样本数和预测
              const totalDist = [distribution[0], distribution[1]];
              const passRate = ((totalDist[1] / (totalDist[0] + totalDist[1])) * 100).toFixed(1);
              leftChild.samples = totalDist[0] + totalDist[1];
              leftChild.name = totalDist[1] > totalDist[0] ? '考试通过' : '考试不通过';
              leftChild.details = `通过率: ${passRate}%`;
              leftChild.prediction = totalDist[1] > totalDist[0];
            }
            rightChild = null;
          }
        }

        // 回溯检查2：如果只有一个子节点，直接返回该子节点
        if (leftChild && !rightChild) return leftChild;
        if (!leftChild && rightChild) return rightChild;

        // 如果是叶子节点，直接返回结果
        if (!leftChild && !rightChild) {
          const passRate = totalSamples > 0 ? ((distribution[1] / totalSamples) * 100).toFixed(1) : '0.0';
          const prediction = distribution[1] > distribution[0];
          return {
            name: prediction ? '考试通过' : '考试不通过',
            details: `通过率: ${passRate}%`,
            samples: totalSamples,
            prediction
          };
        }

        // 构建当前节点
        const feature = featureNames[node.splitColumn] || '未知特征';
        const splitValue = node.splitValue !== undefined ? Number(node.splitValue).toFixed(1) : '0.0';

        return {
          name: `${feature} ≤ ${splitValue}`,
          samples: totalSamples,
          children: [leftChild, rightChild].filter(Boolean)
        };
      };

      // 获取总样本数并设置树数据
      const totalSamples = data.length;
      const newTreeData = convertTreeToVisData(dt.root);
      console.log('构建决策树:', {
        minSamples: Number(minSamples),
        treeData: newTreeData
      });
      setTreeData(newTreeData);
      
      // 通知父组件训练好的树和最小样本数
      onTreeUpdate && onTreeUpdate(dt, minSamples);

    } catch (error) {
      console.error('决策树构建错误:', error);
      setTreeData(null);
      onTreeUpdate && onTreeUpdate(null, minSamples);
    }
  };

  // 当数据、最小样本数或强制更新标记改变时重新构建树
  useEffect(() => {
    buildTree();
  }, [data, minSamples, forceUpdate]);

  // 绘制决策树
  useEffect(() => {
    if (!treeData || !svgRef.current) return;

    const width = 1000;  // 增加总宽度
    const height = 800;  // 增加总高度
    const margin = { top: 40, right: 120, bottom: 40, left: 120 };

    // 清除现有的SVG内容
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 修改为垂直布局的树，增加节点间距
    const tree = d3.tree()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
      .separation((a, b) => (a.parent === b.parent ? 2 : 3));  // 增加节点间距

    const root = d3.hierarchy(treeData);
    tree(root);

    // 添加连接线
    const link = g.selectAll('.link')
      .data(root.links())
      .enter().append('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical()
        .x(d => d.x)
        .y(d => d.y))
      .style('fill', 'none')
      .style('stroke', '#555')
      .style('stroke-opacity', 0.4)
      .style('stroke-width', '1.5px');

    // 添加"是/否"标签
    g.selectAll('.link-label')
      .data(root.links())
      .enter()
      .append('text')
      .attr('class', 'link-label')
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2)
      .attr('text-anchor', d => d.target.x < d.source.x ? 'end' : 'start')
      .attr('dy', '-0.5em')
      .attr('dx', d => d.target.x < d.source.x ? '-1em' : '1em')
      .style('font-size', '12px')
      .style('fill', '#666')
      .text(d => d.target.x < d.source.x ? '是' : '否');

    // 添加节点
    const node = g.selectAll('.node')
      .data(root.descendants())
      .enter().append('g')
      .attr('class', d => 'node' + (d.children ? ' node--internal' : ' node--leaf'))
      .attr('transform', d => `translate(${d.x},${d.y})`);

    // 添加节点圆圈
    node.append('circle')
      .attr('r', d => d.children ? 10 : 15)
      .style('fill', d => {
        if (!d.children) {
          return d.data.prediction ? '#2E7D32' : '#C62828';
        }
        return '#fff';
      })
      .style('stroke', d => d.children ? 'steelblue' : 'none')
      .style('stroke-width', '3px');

    // 添加节点主要文本
    node.append('text')
      .attr('dy', '-1.5em')  // 稍微上移文本
      .attr('x', 0)
      .style('text-anchor', 'middle')
      .text(d => d.children ? d.data.name : '')
      .style('font-size', '12px')
      .style('fill', '#000');

    // 添加节点详细信息
    node.filter(d => d.data.details)
      .append('text')
      .attr('dy', '2.2em')  // 增加文本间距
      .attr('x', 0)
      .style('text-anchor', 'middle')
      .text(d => d.data.details)
      .style('font-size', '10px')
      .style('fill', '#666');

    // 添加样本数量文本
    node.append('text')
      .attr('dy', d => d.data.details ? '3.5em' : '2.5em')  // 增加文本间距
      .attr('x', 0)
      .style('text-anchor', 'middle')
      .text(d => `样本数: ${d.data.samples}`)
      .style('font-size', '10px')
      .style('fill', '#666');

  }, [treeData]);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      width: '100%',
      height: '100%',
      overflow: 'auto',
      position: 'relative'  // 添加相对定位
    }}>
      <Box sx={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        zIndex: 1
      }}>
        <TextField
          label="最小分裂样本数"
          type="number"
          size="small"
          value={minSamples}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            if (!isNaN(value) && value >= 2) {
              setMinSamples(value);
            }
          }}
          inputProps={{ 
            min: 2,
            step: 1,
            style: { width: '80px' }
          }}
        />
        <Button 
          variant="contained" 
          onClick={() => {
            setTreeData(null);  // 先清空现有树
            setForceUpdate(prev => prev + 1);  // 触发强制更新
          }}
          color="primary"
          size="small"
        >
          重新训练
        </Button>
      </Box>
      <Box sx={{ 
        width: '100%', 
        overflowX: 'auto', 
        overflowY: 'hidden'
      }}>
        <svg ref={svgRef}></svg>
      </Box>
    </Box>
  );
} 