'use client';

interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
}

export default function SmartLinkEmailGateToggle({ enabled, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`Require name and email for ${label}`}
      title={enabled ? 'Disable name and email requirement' : 'Enable name and email requirement'}
      onClick={() => onChange(!enabled)}
      className="inline-flex w-32 items-center justify-start gap-2.5 whitespace-nowrap rounded-lg px-2 py-1.5 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#120C29]/30"
    >
      <span
        className={`relative block h-6 w-11 shrink-0 rounded-full transition-colors ${
          enabled ? 'bg-[#120C29]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
      <span className={`w-14 text-xs font-medium ${enabled ? 'text-[#120C29]' : 'text-gray-500'}`}>
        {enabled ? 'Enabled' : 'Disabled'}
      </span>
    </button>
  );
}
