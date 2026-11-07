import { AlertTriangle, Check, Zap } from 'lucide-react';
import { useI18n } from './I18nProvider';

export function ZonePill({ zone }: { zone: 'green' | 'yellow' | 'red' }) {
  const { t } = useI18n();
  const label = zone === 'green' ? t.zoneGreen : zone === 'yellow' ? t.zoneYellow : t.zoneRed;
  const icon =
    zone === 'green' ? <Check size={13} aria-hidden /> :
    zone === 'yellow' ? <AlertTriangle size={13} aria-hidden /> :
    <Zap size={13} aria-hidden />;
  return (
    <span className={`zone-pill zone-${zone}`} role="status">
      {icon}
      {label}
    </span>
  );
}
