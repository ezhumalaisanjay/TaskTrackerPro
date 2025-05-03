import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { QrCodeIcon, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  value?: string;
}

export function BarcodeScanner({
  onScan,
  placeholder = 'Scan or enter code',
  label,
  className,
  disabled = false,
  value = '',
}: BarcodeScannerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const startScanner = async () => {
    try {
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please check permissions.',
        variant: 'destructive',
      });
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const handleScan = () => {
    // In a real implementation, this would use a barcode scanning library
    // For this demo, we'll just simulate a successful scan after a short delay
    setTimeout(() => {
      const mockBarcodeValue = `SCAN-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      setInputValue(mockBarcodeValue);
      onScan(mockBarcodeValue);
      stopScanner();
      
      toast({
        title: 'Code Scanned',
        description: `Successfully scanned code: ${mockBarcodeValue}`,
      });
    }, 1500);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    if (inputValue) {
      onScan(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      onScan(inputValue);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="block text-neutral-400 mb-1">{label}</label>}
      
      <div className="flex">
        <div className="relative flex-1">
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="w-full rounded-r-none"
            placeholder={placeholder}
            disabled={disabled || isScanning}
          />
          <QrCodeIcon className="absolute right-3 top-2 h-5 w-5 text-muted-foreground" />
        </div>
        
        <Button
          type="button"
          className="rounded-l-none"
          onClick={isScanning ? handleScan : startScanner}
          disabled={disabled}
        >
          <Camera className="h-5 w-5" />
        </Button>
      </div>
      
      {isScanning && (
        <div className="mt-2 relative">
          <video
            ref={videoRef}
            className="w-full h-48 object-cover bg-black rounded-md"
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute top-0 left-0 right-0 bg-primary text-white text-center py-1 rounded-t-md">
            Point camera at barcode
          </div>
          
          <Button
            variant="secondary"
            className="absolute bottom-2 right-2"
            onClick={stopScanner}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
