import { useRef, useState } from 'react';
import { fromBackup, toBackup } from '../backup';
import type { Ledger } from '../useLedger';

export function Backup({ ledger }: { ledger: Ledger }) {
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const exportFile = () => {
    const url = URL.createObjectURL(new Blob([toBackup(ledger.nodes)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `day-ledger-${ledger.today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Backup downloaded.');
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      ledger.replaceAll(fromBackup(await file.text()));
      setMsg('Backup restored.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not read that file.');
    }
    if (input.current) input.current.value = '';
  };

  return (
    <footer className="backup">
      <span>Your tasks are stored only in this browser.</span>
      <button type="button" onClick={exportFile}>
        Export backup
      </button>
      <button type="button" onClick={() => input.current?.click()}>
        Import backup
      </button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => importFile(e.target.files?.[0])}
      />
      <span role="status">{msg}</span>
    </footer>
  );
}
