import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Box } from '@mui/material';

export default function DataVisualizer({ data, userInput, prediction }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // 设置图表尺寸和边距
    const width = 400;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };

    // 清除现有的SVG内容
    d3.select(svgRef.current).selectAll("*").remove();

    // 创建SVG容器
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // 创建X轴比例尺
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.hours_studied_per_week) + 5])
      .range([margin.left, width - margin.right]);

    // 创建Y轴比例尺
    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height - margin.bottom, margin.top]);

    // 添加X轴
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .append('text')
      .attr('x', width - margin.right)
      .attr('y', -10)
      .attr('fill', 'black')
      .attr('text-anchor', 'end')
      .text('学习时间 (小时/周)');

    // 添加Y轴
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('x', 10)
      .attr('y', margin.top)
      .attr('fill', 'black')
      .attr('text-anchor', 'start')
      .text('出勤率 (%)');

    // 绘制数据点
    svg.selectAll('.data-point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => xScale(d.hours_studied_per_week))
      .attr('cy', d => yScale(d.attendance_rate_percent))
      .attr('r', 2.5)  // 减小原始数据点的大小
      .style('fill', d => d.passed_exam ? '#4CAF50' : '#f44336')
      .style('opacity', 0.6);

    // 如果有用户输入，添加用户输入点
    if (userInput && userInput.hours && userInput.rate) {
      // 创建呼吸动画
      const pulseAnimation = svg.append('circle')
        .attr('class', 'pulse-ring')
        .attr('cx', xScale(userInput.hours))
        .attr('cy', yScale(userInput.rate))
        .attr('r', 5)
        .style('stroke', prediction ? '#4CAF50' : '#f44336')
        .style('stroke-width', 2)
        .style('fill', 'none')
        .style('opacity', 1);

      // 应用动画
      function pulse() {
        pulseAnimation
          .transition()
          .duration(1500)
          .attr('r', 15)
          .style('opacity', 0)
          .on('end', function() {
            d3.select(this)
              .attr('r', 5)
              .style('opacity', 1);
            pulse();
          });
      }
      pulse();

      // 添加用户输入点
      svg.append('circle')
        .attr('class', 'user-input-point')
        .attr('cx', xScale(userInput.hours))
        .attr('cy', yScale(userInput.rate))
        .attr('r', 5)  // 用户输入点更大
        .style('fill', prediction ? '#4CAF50' : '#f44336')
        .style('opacity', 0.8);
    }

  }, [data, userInput, prediction]);

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <svg ref={svgRef}></svg>
    </Box>
  );
} 