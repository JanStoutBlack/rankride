import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QRCodeDisplayProps {
  value: string;
  title?: string;
  subtitle?: string;
  size?: number;
}

export function QRCodeDisplay({ value, title, subtitle, size = 200 }: QRCodeDisplayProps) {
  return (
    <Card className="w-fit mx-auto">
      <CardHeader className="text-center pb-2">
        {title && <CardTitle className="text-lg">{title}</CardTitle>}
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="flex justify-center p-6">
        <div className="bg-white p-4 rounded-lg">
          <QRCodeSVG 
            value={value} 
            size={size}
            level="H"
            includeMargin
          />
        </div>
      </CardContent>
    </Card>
  );
}