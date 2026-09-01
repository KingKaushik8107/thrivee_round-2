import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { InvestigationPage } from './pages/InvestigationPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { IncidentHistoryPage } from './pages/IncidentHistoryPage';
import { ModelMetricsPage } from './pages/ModelMetricsPage';
import { ShieldAlert } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'investigate' | 'campaigns' | 'model' | 'history'>('dashboard');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const handleInvestigateIncident = (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    setActiveTab('investigate');
  };

  const handleNavigateToCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setActiveTab('campaigns');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'investigate') setSelectedIncidentId(null);
          if (tab === 'campaigns') setSelectedCampaignId(null);
          setActiveTab(tab);
        }}
      />

      {/* Main Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardPage
            onInvestigateIncident={handleInvestigateIncident}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'investigate' && (
          <InvestigationPage
            initialIncidentId={selectedIncidentId}
            onNavigateToCampaign={handleNavigateToCampaign}
          />
        )}

        {activeTab === 'campaigns' && (
          <CampaignsPage
            initialCampaignId={selectedCampaignId}
            onInvestigateIncident={handleInvestigateIncident}
          />
        )}

        {activeTab === 'history' && (
          <IncidentHistoryPage
            onSelectIncident={handleInvestigateIncident}
          />
        )}

        {activeTab === 'model' && (
          <ModelMetricsPage />
        )}
      </main>

      {/* SOC Footer */}
      <footer className="bg-slate-900 border-t border-slate-800/80 py-5 text-xs text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>PS-02 &bull; Phishing Attack Investigation & Correlation Platform &bull; Hackathon Prototype</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-emerald-400 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>FastAPI Backend Active</span>
            </span>
            <span>|</span>
            <span>Dataset: Hugging Face (mamtakumar)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
