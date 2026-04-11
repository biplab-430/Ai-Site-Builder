import React, {
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
    const [selectedElement, setSelectedElement] = useState<any>(null);

    const injectPreview = (html: string) => {
      if (!html || !showEditorPanel) return html;
      return html.includes('</body>')
        ? html.replace('</body>', iframeScript + '</body>')
        : html + iframeScript;
    };

    const resolutions = {
      phone: 'w-[412px]',
      tablet: 'w-[768px]',
      desktop: 'w-full',
    };

    useImperativeHandle(ref, () => ({
      getcode: () =>{
        const doc=iframeRef.current?.contentDocument;
        if(!doc) return undefined;
        doc.querySelectorAll('.ai-selected-element,[data-ai-selected]').forEach((el)=>{
          el.classList.remove('ai-selected-element')
        el.removeAttribute('data-ai-selected');
          (el as HTMLElement).style.outline='none';
        
      })
      const previewStyle=doc.getElementById('ai-preview-style');
      if(previewStyle) previewStyle.remove();
      const  previewScript=doc.getElementById('ai-preview-style')
      if(previewScript) previewScript.remove();

      const html=doc.documentElement.outerHTML;
      return html;

      }
    }));

    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'ELEMENT_SELECTED') {
          setSelectedElement(event.data.payload);
        } else if (event.data?.type === 'CLEAR_SELECTION') {
          setSelectedElement(null);
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, []);

    // ✅ Define update handler (adjust logic as needed)
    const handleUpdate = (updatedStyles: any) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'UPDATE_ELEMENT', payload: updatedStyles },
          '*'
        );
      }
    };

    

    return (
      <div className="relative h-full bg-gray-900 flex-1 rounded-xl overflow-hidden max-sm:ml-2">
        {project.current_code ? (
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
                onClose={()=>{setSelectedElement(null)}}
              />
            )}
          </>
        ) : isGenerating ? (
         <Loaderstep/>
        ) : null}
      </div>
    );
  }
);

ProjectPreview.displayName = 'ProjectPreview';

export default ProjectPreview;
