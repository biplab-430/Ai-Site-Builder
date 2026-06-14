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
        let html = doc.documentElement.outerHTML;
        
        if (!html.toLowerCase().startsWith('<!doctype html>')) {
          html = `<!DOCTYPE html>\n${html}`;
        }
        
        return html;
      }
    }));

    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
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
          '*' 
        );
      }
    };

    return (
      <div className="relative h-full bg-gray-900 flex-1 rounded-xl overflow-hidden max-sm:ml-2">
        
        {/* 1. THE LOADER OVERLAY */}
        {/* If generating, this absolute div covers the entire relative parent container */}
        {isGenerating && (
          <div className="absolute inset-0 z-50 bg-gray-950 flex flex-col">
            <Loaderstep />
          </div>
        )}

        {/* 2. THE IFRAME */}
        {/* The iframe stays mounted so it doesn't lose state, but the loader hides it visually */}
        {project?.current_code && (
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
        )}
      </div>
    );
  }
);

ProjectPreview.displayName = 'ProjectPreview';

export default ProjectPreview;