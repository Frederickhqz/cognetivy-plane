import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { WorkflowPage } from "@/pages/WorkflowPage";
import { RunsPage } from "@/pages/RunsPage";
import { RunDetailPage } from "@/pages/RunDetailPage";
import { EntityPage } from "@/pages/EntityPage";
import { CollectionsPage } from "@/pages/CollectionsPage";
import { CollectionItemPage } from "@/pages/CollectionItemPage";
import { WorkflowSelectionProvider } from "@/contexts/WorkflowSelectionContext";
import { RunsEmbed } from "@/components/embed/RunsEmbed";
import { WorkflowEditorEmbed } from "@/components/embed/WorkflowEditorEmbed";

function App() {
  return (
    <WorkflowSelectionProvider>
      <Routes>
        {/* Embed routes for Plane integration - no layout */}
        <Route path="/embed/runs" element={<RunsEmbed />} />
        <Route path="/embed/workflow/:workflowId" element={<WorkflowEditorEmbed />} />
        
        {/* Standard routes with layout */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<WorkflowPage />} />
          <Route path="workflow" element={<WorkflowPage />} />
          <Route path="runs" element={<RunsPage />} />
          <Route path="runs/:runId" element={<RunDetailPage />} />
          <Route path="runs/:runId/collections/:kind/items/:itemId" element={<CollectionItemPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="data/:kind" element={<EntityPage />} />
          <Route path="data/:kind/items/:itemId" element={<CollectionItemPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </WorkflowSelectionProvider>
  );
}

export default App;
