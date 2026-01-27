import React, { useRef, useEffect } from 'react';

// مكون محرر BPMN مبسط باستخدام bpmn-js (يتطلب تثبيت الحزمة)
// npm install bpmn-js

export default function BPMNEditor({ xml, onChange }: { xml?: string; onChange?: (xml: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<any>(null);

  useEffect(() => {
    let modeler: any;
    (async () => {
      const BpmnJS = (await import('bpmn-js/dist/bpmn-modeler.production.min.js')).default;
      modeler = new BpmnJS({ container: containerRef.current });
      modelerRef.current = modeler;
      if (xml) {
        await modeler.importXML(xml);
      } else {
        await modeler.createDiagram();
      }
      if (onChange) {
        modeler.on('commandStack.changed', async () => {
          const { xml } = await modeler.saveXML({ format: true });
          onChange(xml);
        });
      }
    })();
    return () => {
      if (modeler) modeler.destroy();
    };
  }, []);

  return (
    <div>
      <div ref={containerRef} style={{ width: '100%', height: 500, border: '1px solid #ccc', borderRadius: 8 }} />
    </div>
  );
}
