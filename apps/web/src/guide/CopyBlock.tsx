import { useState } from "react";
import { MdCheck, MdContentCopy } from "react-icons/md";

export function CopyBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="guide-codeblock">
      <div className="guide-codeblock-bar">
        <span>{label ?? "terminal"}</span>
        <button type="button" className="guide-copy-btn" onClick={() => void copy()}>
          {copied ? <MdCheck size={14} /> : <MdContentCopy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>{code}</pre>
    </div>
  );
}
