import { Shield, Lock, Building2, CreditCard } from 'lucide-react';

interface TrustBadgesProps {
  variant?: 'full' | 'compact';
}

export function TrustBadges({ variant = 'full' }: TrustBadgesProps) {
  const banks = ['FNB', 'Standard Bank', 'ABSA', 'Nedbank', 'Capitec'];
  
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          <span>256-bit SSL</span>
        </div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1">
          <Lock className="h-3 w-3" />
          <span>PCI Compliant</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Shield className="h-4 w-4 text-primary" />
        <span>Trusted & Secure Payments</span>
      </div>
      
      {/* Bank partnerships */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Building2 className="h-3 w-3" />
          Partnered with major South African banks
        </p>
        <div className="flex flex-wrap gap-2">
          {banks.map((bank) => (
            <div
              key={bank}
              className="px-3 py-1.5 rounded-lg bg-secondary/50 text-xs font-medium text-muted-foreground border border-border/30"
            >
              {bank}
            </div>
          ))}
        </div>
      </div>

      {/* Security badges */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/20">
          <Lock className="h-4 w-4 text-success" />
          <div className="text-xs">
            <p className="font-medium text-foreground">256-bit SSL</p>
            <p className="text-muted-foreground">Encryption</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
          <CreditCard className="h-4 w-4 text-primary" />
          <div className="text-xs">
            <p className="font-medium text-foreground">PCI DSS</p>
            <p className="text-muted-foreground">Compliant</p>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Your payment data is protected with bank-level security
      </p>
    </div>
  );
}
