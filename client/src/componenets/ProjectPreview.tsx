import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useImperativeHandle
} from 'react';
import type { Project } from '../types';
import { iframeScript } from '../assets/assets';
import EditorPanel from './EditorPanel';
import Loaderstep from './Loaderstep';

export interface ProjectPreviewRef {
  getcode: () => string | undefined;
}

interface ProjectPreviewProps {
  project: Project;
  isGenerating: boolean;
  device?: 'phone' | 'desktop' | 'tablet';
  showEditorPanel?: boolean;
}

const ProjectPreview = forwardRef<ProjectPreviewRef, ProjectPreviewProps>(
  ({ project, isGenerating, device = 'desktop', showEditorPanel = true }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Replaced 'any' with a more generic object type, assuming payload is an object representing DOM traits
    const [selectedElement, setSelectedElement] = useState<Record<string, unknown> | null>(null);

    const injectPreview = (html: string) => {
      if (!html) return '';
      if (!showEditorPanel) return html;
      
      if (html.includes('</body>')) {
        return html.replace('</body>', iframeScript + '</body>');
      } else {
        return html + iframeScript;
      }
    };

    const resolutions = {
      phone: 'w-[412px]',
      tablet: 'w-[768px]',
      desktop: 'w-full',
    };

    useImperativeHandle(ref, () => ({
      getcode: () => {
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return undefined;

        // 1. REMOVE SELECTION TRACES
        doc.querySelectorAll('.ai-selected-element, [data-ai-selected]').forEach((el) => {
          el.classList.remove('ai-selected-element');
          el.removeAttribute('data-ai-selected');
          (el as HTMLElement).style.outline = '';
        });

        // 2. REMOVE INJECTED SCRIPTS & STYLES
        const previewStyle = doc.getElementById('ai-preview-style');
        if (previewStyle) previewStyle.remove();
        
        const previewScript = doc.getElementById('ai-preview-script');
        if (previewScript) previewScript.remove();

        // 3. CLEAN HTML & PRESERVE DOCTYPE
        // Without the DOCTYPE, downloaded HTML will render in "Quirks Mode" and break modern CSS.
        let html = doc.documentElement.outerHTML;
        
        // Ensure DOCTYPE is attached at the very top
        if (!html.toLowerCase().startsWith('<!doctype html>')) {
          html = `<!DOCTYPE html>\n${html}`;
        }
        
        return html;
      }
    }));

    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        // Optional Security Check: Ensure message comes from our iframe
        if (event.source !== iframeRef.current?.contentWindow) return;

        if (event.data?.type === 'ELEMENT_SELECTED') {
          setSelectedElement(event.data.payload);
        } else if (event.data?.type === 'CLEAR_SELECTION') {
          setSelectedElement(null);
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleUpdate = (updateS: Record<string, unknown>) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'UPDATE_ELEMENT', payload: updateS },
          '*' // In a production app with a known domain, replace '*' with window.location.origin
        );
      }
    };

    return (
      <div className="relative h-full bg-gray-900 flex-1 rounded-xl overflow-hidden max-sm:ml-2">
        {project?.current_code ? (
          <>
            <iframe
              ref={iframeRef}
              srcDoc={injectPreview(project.current_code)}
              sandbox="allow-scripts allow-same-origin"
              className={`max-sm:w-full h-full ${resolutions[device]} mx-auto transition-all`}
            />

            {showEditorPanel && selectedElement && (
              <EditorPanel
                selectedElement={selectedElement}
                onUpdate={handleUpdate}
                onClose={() => {
                  setSelectedElement(null);
                  if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage(
                      { type: 'CLEAR_SELECTION_REQUEST' }, 
                      '*'
                    );
                  }
                }}
              />
            )}
          </>
        ) : isGenerating ? (
          <Loaderstep />
        ) : null}
      </div>
    );
  }
);

ProjectPreview.displayName = 'ProjectPreview';

export default ProjectPreview;