/**
 * Analyze image differences to identify where differences occur
 */

const fs = require('fs').promises;
const path = require('path');

let createCanvas, loadImage;
try {
  const canvas = require('canvas');
  createCanvas = canvas.createCanvas;
  loadImage = canvas.loadImage;
} catch (e) {
  console.error('Error: canvas module not found. Install with: npm install canvas');
  process.exit(1);
}

async function analyzeDifferences(clientImagePath, serverImagePath, diffImagePath) {
  console.log('\n=== Analyzing Image Differences ===\n');
  
  const clientImg = await loadImage(clientImagePath);
  const serverImg = await loadImage(serverImagePath);
  const diffImg = await loadImage(diffImagePath);
  
  console.log(`Image dimensions: ${clientImg.width}x${clientImg.height}`);
  console.log(`Client image: ${clientImagePath}`);
  console.log(`Server image: ${serverImagePath}`);
  console.log(`Difference image: ${diffImagePath}\n`);
  
  // Create canvases
  const clientCanvas = createCanvas(clientImg.width, clientImg.height);
  const clientCtx = clientCanvas.getContext('2d');
  clientCtx.drawImage(clientImg, 0, 0);
  
  const serverCanvas = createCanvas(serverImg.width, serverImg.height);
  const serverCtx = serverCanvas.getContext('2d');
  serverCtx.drawImage(serverImg, 0, 0);
  
  const diffCanvas = createCanvas(diffImg.width, diffImg.height);
  const diffCtx = diffCanvas.getContext('2d');
  diffCtx.drawImage(diffImg, 0, 0);
  
  // Get image data
  const clientData = clientCtx.getImageData(0, 0, clientImg.width, clientImg.height);
  const serverData = serverCtx.getImageData(0, 0, serverImg.width, serverImg.height);
  const diffData = diffCtx.getImageData(0, 0, diffImg.width, diffImg.height);
  
  // Analyze differences by region (divide image into 9 regions: top-left, top-center, top-right, etc.)
  const regions = {
    'top-left': { x: 0, y: 0, width: Math.floor(clientImg.width / 3), height: Math.floor(clientImg.height / 3) },
    'top-center': { x: Math.floor(clientImg.width / 3), y: 0, width: Math.floor(clientImg.width / 3), height: Math.floor(clientImg.height / 3) },
    'top-right': { x: Math.floor(clientImg.width * 2 / 3), y: 0, width: clientImg.width - Math.floor(clientImg.width * 2 / 3), height: Math.floor(clientImg.height / 3) },
    'middle-left': { x: 0, y: Math.floor(clientImg.height / 3), width: Math.floor(clientImg.width / 3), height: Math.floor(clientImg.height / 3) },
    'middle-center': { x: Math.floor(clientImg.width / 3), y: Math.floor(clientImg.height / 3), width: Math.floor(clientImg.width / 3), height: Math.floor(clientImg.height / 3) },
    'middle-right': { x: Math.floor(clientImg.width * 2 / 3), y: Math.floor(clientImg.height / 3), width: clientImg.width - Math.floor(clientImg.width * 2 / 3), height: Math.floor(clientImg.height / 3) },
    'bottom-left': { x: 0, y: Math.floor(clientImg.height * 2 / 3), width: Math.floor(clientImg.width / 3), height: clientImg.height - Math.floor(clientImg.height * 2 / 3) },
    'bottom-center': { x: Math.floor(clientImg.width / 3), y: Math.floor(clientImg.height * 2 / 3), width: Math.floor(clientImg.width / 3), height: clientImg.height - Math.floor(clientImg.height * 2 / 3) },
    'bottom-right': { x: Math.floor(clientImg.width * 2 / 3), y: Math.floor(clientImg.height * 2 / 3), width: clientImg.width - Math.floor(clientImg.width * 2 / 3), height: clientImg.height - Math.floor(clientImg.height * 2 / 3) }
  };
  
  const regionStats = {};
  
  for (const [regionName, region] of Object.entries(regions)) {
    let diffPixels = 0;
    let totalPixels = 0;
    let colorDiffs = { r: 0, g: 0, b: 0, a: 0 };
    let colorDiffCount = 0;
    
    for (let y = region.y; y < region.y + region.height; y++) {
      for (let x = region.x; x < region.x + region.width; x++) {
        const idx = (y * clientImg.width + x) * 4;
        
        // Check if this is a difference pixel (red in diff image)
        const diffR = diffData.data[idx];
        const diffG = diffData.data[idx + 1];
        const diffB = diffData.data[idx + 2];
        
        if (diffR > 200 && diffG < 50 && diffB < 50) {
          diffPixels++;
          
          // Calculate color difference
          const clientR = clientData.data[idx];
          const clientG = clientData.data[idx + 1];
          const clientB = clientData.data[idx + 2];
          const clientA = clientData.data[idx + 3];
          
          const serverR = serverData.data[idx];
          const serverG = serverData.data[idx + 1];
          const serverB = serverData.data[idx + 2];
          const serverA = serverData.data[idx + 3];
          
          colorDiffs.r += Math.abs(clientR - serverR);
          colorDiffs.g += Math.abs(clientG - serverG);
          colorDiffs.b += Math.abs(clientB - serverB);
          colorDiffs.a += Math.abs(clientA - serverA);
          colorDiffCount++;
        }
        
        totalPixels++;
      }
    }
    
    const diffPercent = (diffPixels / totalPixels) * 100;
    const avgColorDiff = colorDiffCount > 0 ? {
      r: colorDiffs.r / colorDiffCount,
      g: colorDiffs.g / colorDiffCount,
      b: colorDiffs.b / colorDiffCount,
      a: colorDiffs.a / colorDiffCount
    } : null;
    
    regionStats[regionName] = {
      diffPixels,
      totalPixels,
      diffPercent,
      avgColorDiff
    };
  }
  
  // Print results
  console.log('=== Difference Analysis by Region ===\n');
  
  const sortedRegions = Object.entries(regionStats)
    .sort((a, b) => b[1].diffPercent - a[1].diffPercent);
  
  for (const [regionName, stats] of sortedRegions) {
    if (stats.diffPercent > 0.1) {
      console.log(`${regionName}:`);
      console.log(`  Different pixels: ${stats.diffPixels} / ${stats.totalPixels} (${stats.diffPercent.toFixed(2)}%)`);
      if (stats.avgColorDiff) {
        console.log(`  Average color difference: R=${stats.avgColorDiff.r.toFixed(1)}, G=${stats.avgColorDiff.g.toFixed(1)}, B=${stats.avgColorDiff.b.toFixed(1)}, A=${stats.avgColorDiff.a.toFixed(1)}`);
      }
      console.log('');
    }
  }
  
  // Analyze color patterns
  console.log('\n=== Color Difference Patterns ===\n');
  
  const colorPatterns = {
    'mostly-red': 0,
    'mostly-green': 0,
    'mostly-blue': 0,
    'mostly-brightness': 0,
    'mostly-alpha': 0
  };
  
  let totalDiffPixels = 0;
  
  for (let i = 0; i < diffData.data.length; i += 4) {
    const diffR = diffData.data[i];
    const diffG = diffData.data[i + 1];
    const diffB = diffData.data[i + 2];
    
    if (diffR > 200 && diffG < 50 && diffB < 50) {
      totalDiffPixels++;
      
      const clientR = clientData.data[i];
      const clientG = clientData.data[i + 1];
      const clientB = clientData.data[i + 2];
      const clientA = clientData.data[i + 3];
      
      const serverR = serverData.data[i];
      const serverG = serverData.data[i + 1];
      const serverB = serverData.data[i + 2];
      const serverA = serverData.data[i + 3];
      
      const rDiff = Math.abs(clientR - serverR);
      const gDiff = Math.abs(clientG - serverG);
      const bDiff = Math.abs(clientB - serverB);
      const aDiff = Math.abs(clientA - serverA);
      const brightnessDiff = Math.abs((clientR + clientG + clientB) / 3 - (serverR + serverG + serverB) / 3);
      
      if (rDiff > gDiff && rDiff > bDiff && rDiff > brightnessDiff) colorPatterns['mostly-red']++;
      else if (gDiff > rDiff && gDiff > bDiff && gDiff > brightnessDiff) colorPatterns['mostly-green']++;
      else if (bDiff > rDiff && bDiff > gDiff && bDiff > brightnessDiff) colorPatterns['mostly-blue']++;
      else if (brightnessDiff > rDiff && brightnessDiff > gDiff && brightnessDiff > bDiff) colorPatterns['mostly-brightness']++;
      else if (aDiff > 10) colorPatterns['mostly-alpha']++;
    }
  }
  
  if (totalDiffPixels > 0) {
    console.log(`Total different pixels: ${totalDiffPixels}`);
    console.log('\nColor difference patterns:');
    for (const [pattern, count] of Object.entries(colorPatterns)) {
      if (count > 0) {
        const percent = (count / totalDiffPixels) * 100;
        console.log(`  ${pattern}: ${count} pixels (${percent.toFixed(1)}%)`);
      }
    }
  }
  
  // Analyze vertical distribution (to identify if differences are in specific areas like header, content, footer)
  console.log('\n=== Vertical Distribution Analysis ===\n');
  
  const verticalBands = 10;
  const bandHeight = Math.floor(clientImg.height / verticalBands);
  const verticalStats = [];
  
  for (let band = 0; band < verticalBands; band++) {
    const yStart = band * bandHeight;
    const yEnd = Math.min((band + 1) * bandHeight, clientImg.height);
    let diffPixels = 0;
    let totalPixels = 0;
    
    for (let y = yStart; y < yEnd; y++) {
      for (let x = 0; x < clientImg.width; x++) {
        const idx = (y * clientImg.width + x) * 4;
        const diffR = diffData.data[idx];
        
        if (diffR > 200 && diffData.data[idx + 1] < 50 && diffData.data[idx + 2] < 50) {
          diffPixels++;
        }
        totalPixels++;
      }
    }
    
    const diffPercent = (diffPixels / totalPixels) * 100;
    verticalStats.push({
      band,
      yStart,
      yEnd,
      diffPercent
    });
  }
  
  console.log('Difference percentage by vertical position:');
  verticalStats.forEach(stat => {
    const barLength = Math.floor(stat.diffPercent / 2);
    const bar = '█'.repeat(barLength);
    console.log(`  ${stat.yStart.toString().padStart(4)}-${stat.yEnd.toString().padStart(4)}px: ${bar} ${stat.diffPercent.toFixed(2)}%`);
  });
  
  // Analyze horizontal distribution
  console.log('\n=== Horizontal Distribution Analysis ===\n');
  
  const horizontalBands = 10;
  const bandWidth = Math.floor(clientImg.width / horizontalBands);
  const horizontalStats = [];
  
  for (let band = 0; band < horizontalBands; band++) {
    const xStart = band * bandWidth;
    const xEnd = Math.min((band + 1) * bandWidth, clientImg.width);
    let diffPixels = 0;
    let totalPixels = 0;
    
    for (let x = xStart; x < xEnd; x++) {
      for (let y = 0; y < clientImg.height; y++) {
        const idx = (y * clientImg.width + x) * 4;
        const diffR = diffData.data[idx];
        
        if (diffR > 200 && diffData.data[idx + 1] < 50 && diffData.data[idx + 2] < 50) {
          diffPixels++;
        }
        totalPixels++;
      }
    }
    
    const diffPercent = (diffPixels / totalPixels) * 100;
    horizontalStats.push({
      band,
      xStart,
      xEnd,
      diffPercent
    });
  }
  
  console.log('Difference percentage by horizontal position:');
  horizontalStats.forEach(stat => {
    const barLength = Math.floor(stat.diffPercent / 2);
    const bar = '█'.repeat(barLength);
    console.log(`  ${stat.xStart.toString().padStart(4)}-${stat.xEnd.toString().padStart(4)}px: ${bar} ${stat.diffPercent.toFixed(2)}%`);
  });
  
  console.log('\n=== Summary ===\n');
  console.log('Based on the analysis above, differences are most likely in:');
  const topRegions = sortedRegions.slice(0, 3).filter(([_, stats]) => stats.diffPercent > 0.1);
  if (topRegions.length > 0) {
    topRegions.forEach(([regionName, stats]) => {
      console.log(`  - ${regionName} region (${stats.diffPercent.toFixed(2)}% different)`);
    });
  }
  
  const topVertical = verticalStats.sort((a, b) => b.diffPercent - a.diffPercent).slice(0, 2);
  if (topVertical.length > 0 && topVertical[0].diffPercent > 0.1) {
    console.log('\nVertical hotspots:');
    topVertical.forEach(stat => {
      console.log(`  - Y position ${stat.yStart}-${stat.yEnd}px (${stat.diffPercent.toFixed(2)}% different)`);
    });
  }
  
  const topHorizontal = horizontalStats.sort((a, b) => b.diffPercent - a.diffPercent).slice(0, 2);
  if (topHorizontal.length > 0 && topHorizontal[0].diffPercent > 0.1) {
    console.log('\nHorizontal hotspots:');
    topHorizontal.forEach(stat => {
      console.log(`  - X position ${stat.xStart}-${stat.xEnd}px (${stat.diffPercent.toFixed(2)}% different)`);
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: node analyze-image-differences.js <clientImage> <serverImage> <diffImage>');
    console.log('\nExample:');
    console.log('  node analyze-image-differences.js comparison-output-568/client_page_1.png comparison-output-568/server_page_1.png comparison-output-568/difference_page_1.png');
    process.exit(1);
  }
  
  const clientImagePath = path.resolve(args[0]);
  const serverImagePath = path.resolve(args[1]);
  const diffImagePath = path.resolve(args[2]);
  
  try {
    await fs.access(clientImagePath);
    await fs.access(serverImagePath);
    await fs.access(diffImagePath);
  } catch (error) {
    console.error('Error: One or more image files not found');
    console.error(`Client: ${clientImagePath}`);
    console.error(`Server: ${serverImagePath}`);
    console.error(`Diff: ${diffImagePath}`);
    process.exit(1);
  }
  
  await analyzeDifferences(clientImagePath, serverImagePath, diffImagePath);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { analyzeDifferences };

