/**
 * QRScanner — camera-based QR reader built on html5-qrcode.
 *
 * Used by drivers to scan customer tickets and by customers to scan a driver's
 * payment code. The scanner instance is torn down on unmount and when scanning
 * stops, otherwise the camera stream stays open.
 */
import { useEffect, useRef, useState } from 'react';

import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const startScanner = () => {
    setIsScanning(true);
    
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        onScan(decodedText);
        stopScanner();
      },
      (errorMessage) => {
        // Ignore scan errors - they're expected when no QR code is visible
        if (onError && !errorMessage.includes('No QR code found')) {
          onError(errorMessage);
        }
      }
    );
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          QR Scanner
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isScanning ? (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Click the button below to start scanning tickets
            </p>
            <Button onClick={startScanner} size="lg">
              <Camera className="h-4 w-4 mr-2" />
              Start Scanner
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div id="qr-reader" className="w-full max-w-md mx-auto" />
            <div className="text-center">
              <Button variant="outline" onClick={stopScanner}>
                <CameraOff className="h-4 w-4 mr-2" />
                Stop Scanner
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}