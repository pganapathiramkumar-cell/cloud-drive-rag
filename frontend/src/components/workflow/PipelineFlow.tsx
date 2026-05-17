import { useWorkflowStore } from '../../stores/workflowStore'
import PipelineNode from './PipelineNode'

export default function PipelineFlow() {
  const { stages, expandedNode, learningMode, setExpanded } = useWorkflowStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {stages.map((stage, i) => (
        <div key={stage.node}>
          <PipelineNode
            stage={stage}
            expanded={expandedNode === stage.node}
            learningMode={learningMode}
            onExpand={() => setExpanded(stage.node)}
          />
          {i < stages.length - 1 && (
            <div className={`ds-wf-connector ${
              stages[i + 1].status !== 'pending' ? 'ds-wf-connector--active' : ''
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}
