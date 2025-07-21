import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image } from 'react-konva';
import Konva from 'konva';
import { useColorSettings } from '../hooks/useColorSettings';
import { useBackground } from '../hooks/useBackground';
import { useInkStamp } from '../hooks/useInkStamp';
import { useEdgeCleanup } from '../hooks/useEdgeCleanup';

interface MainCanvasProps {
  image: { originalData: ImageData | null; processedData: ImageData | null } | null;
  colorSettingsEnabled: boolean;
  backgroundEnabled: boolean;
  inkStampEnabled: boolean;
  edgeCleanupEnabled: boolean;
  colorRemovalSettings: any;
  effectSettings: any;
  hasManualEditsRef: React.MutableRefObject<boolean>;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({
  image,
  colorSettingsEnabled,
  backgroundEnabled,
  inkStampEnabled,
  edgeCleanupEnabled,
  colorRemovalSettings,
  effectSettings,
  hasManualEditsRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const imageRef = useRef<Konva.Image>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { applyColorSettings } = useColorSettings();
  const { applyBackground } = useBackground();
  const { applyInkStamp } = useInkStamp();
  const { applyEdgeCleanup } = useEdgeCleanup();

  // Main processing effect
  useEffect(() => {
    const hasAnyProcessingEnabled = colorSettingsEnabled || backgroundEnabled || inkStampEnabled || edgeCleanupEnabled;
    
    console.log('Processing effect triggered - checking conditions:', {
      hasOriginalImageData: !!image?.originalData,
      hasCanvas: !!canvasRef.current,
      hasManualEdits: hasManualEditsRef.current,
      isProcessing: isProcessingRef.current,
      imageHasProcessedData: !!image?.processedData,
      colorSettingsEnabled,
      backgroundEnabled,
      inkStampEnabled,
      edgeCleanupEnabled
    });

    if (!image?.originalData || !canvasRef.current || isProcessingRef.current) {
      return;
    }

    // Early return if no processing is enabled
    if (!hasAnyProcessingEnabled) {
      console.log('Early return - no processing needed');
      // Only restore original data if there are NO manual edits
      if (image?.originalData && !hasManualEditsRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
          console.log('Restoring original image data (no manual edits)');
          ctx.putImageData(image.originalData, 0, 0);
        }
      } else if (hasManualEditsRef.current) {
        console.log('Preserving manual edits - not restoring original data');
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsProcessing(true);

    // Clone the original image data to avoid modifying the original
    const clonedData = new ImageData(
      new Uint8ClampedArray(image.originalData.data),
      image.originalData.width,
      image.originalData.height
    );

    let processedData: ImageData = clonedData;

    // Apply image processing steps
    if (colorSettingsEnabled) {
      processedData = applyColorSettings(processedData, colorRemovalSettings);
    }
    if (backgroundEnabled) {
      processedData = applyBackground(processedData, effectSettings);
    }
    if (inkStampEnabled) {
      processedData = applyInkStamp(processedData, effectSettings);
    }
    if (edgeCleanupEnabled) {
      processedData = applyEdgeCleanup(processedData, effectSettings);
    }

    // Put the processed image data on the canvas
    ctx.putImageData(processedData, 0, 0);
    setIsProcessing(false);
  }, [image?.originalData, colorSettingsEnabled, backgroundEnabled, inkStampEnabled, edgeCleanupEnabled, colorRemovalSettings, effectSettings]);

  return (
    <canvas
      ref={canvasRef}
      width={image?.originalData?.width}
      height={image?.originalData?.height}
      style={{
        width: '100%',
        height: 'auto',
        maxWidth: '100%',
        maxHeight: '80vh',
        objectFit: 'contain'
      }}
    />
  );
};
