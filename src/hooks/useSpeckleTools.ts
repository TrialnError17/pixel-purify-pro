import { useCallback } from 'react';

export interface SpeckleSettings {
  enabled: boolean;
  highlightSpecks: boolean;
  removeSpecks: boolean;
  minSpeckSize: number;
}

export interface SpeckleResult {
  processedData: ImageData;
  speckCount: number;
  largestSpeckBounds?: { x: number; y: number; width: number; height: number };
}

export const useSpeckleTools = () => {
  
  // Connected component labeling using 8-way connectivity
  const findConnectedComponents = useCallback((imageData: ImageData): { components: number[][], speckCount: number, largestSpeck?: { x: number; y: number; width: number; height: number } } => {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const visited = new Array(width * height).fill(false);
    const labels = new Array(width * height).fill(-1);
    let componentId = 0;
    const components: number[][] = [];
    let largestSpeck: { x: number; y: number; width: number; height: number } | undefined;
    let largestSize = 0;

    const isTransparent = (x: number, y: number): boolean => {
      const index = (y * width + x) * 4;
      return data[index + 3] === 0;
    };

    const getNeighbors = (x: number, y: number): [number, number][] => {
      const neighbors: [number, number][] = [];
      // 8-way connectivity
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            neighbors.push([nx, ny]);
          }
        }
      }
      return neighbors;
    };

    const floodFill = (startX: number, startY: number): number[] => {
      const component: number[] = [];
      const stack: [number, number][] = [[startX, startY]];
      
      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const index = y * width + x;
        
        if (visited[index] || isTransparent(x, y)) continue;
        
        visited[index] = true;
        labels[index] = componentId;
        component.push(index);
        
        getNeighbors(x, y).forEach(([nx, ny]) => {
          const nIndex = ny * width + nx;
          if (!visited[nIndex] && !isTransparent(nx, ny)) {
            stack.push([nx, ny]);
          }
        });
      }
      
      return component;
    };

    // Find all connected components
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        if (!visited[index] && !isTransparent(x, y)) {
          const component = floodFill(x, y);
          if (component.length > 0) {
            components.push(component);
            
            // Track largest component for auto-zoom
            if (component.length > largestSize) {
              largestSize = component.length;
              
              // Calculate bounding box
              let minX = width, maxX = 0, minY = height, maxY = 0;
              component.forEach(idx => {
                const px = idx % width;
                const py = Math.floor(idx / width);
                minX = Math.min(minX, px);
                maxX = Math.max(maxX, px);
                minY = Math.min(minY, py);
                maxY = Math.max(maxY, py);
              });
              
              largestSpeck = {
                x: minX,
                y: minY,
                width: maxX - minX + 1,
                height: maxY - minY + 1
              };
            }
            
            componentId++;
          }
        }
      }
    }

    // Count specks (components smaller than threshold will be considered specks)
    const speckCount = components.filter(component => component.length <= largestSize * 0.1).length;

    return { components, speckCount, largestSpeck };
  }, []);

  // Highlight specks by adding red glow
  const highlightSpecks = useCallback((imageData: ImageData, settings: SpeckleSettings): SpeckleResult => {
    const { components, speckCount, largestSpeck } = findConnectedComponents(imageData);
    const processedData = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    
    const data = processedData.data;
    const width = imageData.width;

    // Highlight small components (specks) in bright red
    components.forEach(component => {
      if (component.length <= settings.minSpeckSize) {
        component.forEach(index => {
          const x = index % width;
          const y = Math.floor(index / width);
          
          // Add red glow around the speck
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < imageData.height) {
                const nIndex = (ny * width + nx) * 4;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= 2) {
                  const intensity = Math.max(0, 1 - distance / 2);
                  data[nIndex] = Math.min(255, data[nIndex] + intensity * 255); // Red
                  data[nIndex + 1] = Math.max(0, data[nIndex + 1] * (1 - intensity * 0.8)); // Reduce green
                  data[nIndex + 2] = Math.max(0, data[nIndex + 2] * (1 - intensity * 0.8)); // Reduce blue
                  data[nIndex + 3] = Math.max(data[nIndex + 3], intensity * 200); // Ensure visibility
                }
              }
            }
          }
        });
      }
    });

    return {
      processedData,
      speckCount: components.filter(comp => comp.length <= settings.minSpeckSize).length,
      largestSpeckBounds: largestSpeck
    };
  }, [findConnectedComponents]);

  // Remove specks by making them transparent, and highlight remaining larger specks
  const removeSpecks = useCallback((imageData: ImageData, settings: SpeckleSettings): SpeckleResult => {
    const { components, speckCount, largestSpeck } = findConnectedComponents(imageData);
    const processedData = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    
    const data = processedData.data;
    const width = imageData.width;
    let removedSpecks = 0;
    let remainingSpecks = 0;

    // Process all components
    components.forEach(component => {
      if (component.length <= settings.minSpeckSize) {
        // Remove small components (specks) by making them transparent
        component.forEach(index => {
          const pixelIndex = index * 4;
          data[pixelIndex + 3] = 0; // Make transparent
        });
        removedSpecks++;
      } else {
        // Highlight remaining larger specks in red so user can see what's left
        component.forEach(index => {
          const x = index % width;
          const y = Math.floor(index / width);
          
          // Add red glow around the remaining speck
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < imageData.height) {
                const nIndex = (ny * width + nx) * 4;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= 2) {
                  const intensity = Math.max(0, 1 - distance / 2);
                  data[nIndex] = Math.min(255, data[nIndex] + intensity * 255); // Red
                  data[nIndex + 1] = Math.max(0, data[nIndex + 1] * (1 - intensity * 0.8)); // Reduce green
                  data[nIndex + 2] = Math.max(0, data[nIndex + 2] * (1 - intensity * 0.8)); // Reduce blue
                  data[nIndex + 3] = Math.max(data[nIndex + 3], intensity * 200); // Ensure visibility
                }
              }
            }
          }
        });
        remainingSpecks++;
      }
    });

    console.log(`Removed ${removedSpecks} specks (components <= ${settings.minSpeckSize} pixels), highlighted ${remainingSpecks} remaining larger specks`);

    return {
      processedData,
      speckCount: removedSpecks,
      largestSpeckBounds: largestSpeck
    };
  }, [findConnectedComponents]);

  // Process specks based on settings
  const processSpecks = useCallback((imageData: ImageData, settings: SpeckleSettings): SpeckleResult => {
    if (!settings.enabled) {
      return {
        processedData: imageData,
        speckCount: 0
      };
    }

    if (settings.removeSpecks) {
      return removeSpecks(imageData, settings);
    } else if (settings.highlightSpecks) {
      return highlightSpecks(imageData, settings);
    }

    return {
      processedData: imageData,
      speckCount: 0
    };
  }, [highlightSpecks, removeSpecks]);

  return {
    processSpecks,
    findConnectedComponents
  };
};